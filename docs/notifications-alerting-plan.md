# Notifications + Alerting (Prometheus + Alertmanager + Pluto)

## Obiettivo

- Configurare notifiche per-device con soglie su metriche (Device Settings).
- Configurare canale notifiche globale via ntfy (Settings).
- Usare Prometheus + Alertmanager per lo stato degli alert (firing/resolved).
- Usare Pluto backend come dispatcher dei canali (ntfy oggi, estendibile domani).

## Architettura (high level)

1. Pluto backend:
   - Polling dispositivi (gia' esistente).
   - Espone `/metrics` (gia' esistente).
   - Espone anche metriche label-based per-device e metriche di soglia (nuove).
   - Riceve webhook da Alertmanager e inoltra ai canali (nuovo).
2. Prometheus:
   - Scrape `backend:/metrics`.
   - Carica regole alert statiche.
   - Invia gli alert ad Alertmanager.
3. Alertmanager:
   - Raggruppa/dedup/silence/repeat.
   - Invia webhook a Pluto backend.
4. Ntfy:
   - Pluto backend pubblica su `${serverUrl}/${topic}`.

## Principi chiave

- Soglie per-device NON generano regole dinamiche:
  - le soglie sono metriche (`pluto_threshold_*`) e PromQL fa join su label.
- I segreti dei canali (password/token) restano in Pluto (DB/env), non in Alertmanager/Prometheus.
- UI predisposta per piu' provider, ma implementiamo solo `ntfy`.

## Modello dati (common/interfaces)

Aggiungere `common/interfaces/notifications.interface.ts` ed esportarlo da `common/interfaces/index.ts`.

### Global settings

- `NotificationSettings`:
  - `enabled: boolean`
  - `channels: NotificationChannel[]`

- `NotificationChannel` (union, estendibile):
  - `{ type: "ntfy"; enabled: boolean; config: NtfyConfig }`
  - (future) `{ type: "telegram" | "discord" | ... }` placeholder

- `NtfyConfig`:
  - `serverUrl: string`
  - `topic: string`
  - `auth`:
    - `{ type: "none" }`
    - `{ type: "basic"; username: string; password?: string; hasPassword?: boolean }`
    - `{ type: "token"; token?: string; hasToken?: boolean }`

### Per-device

Estendere `Device` in `common/interfaces/device-info.interface.ts` con:

- `notificationSettings?: DeviceNotificationSettings`

- `DeviceNotificationSettings`:
  - `enabled: boolean`
  - `offline: { enabled: boolean }`
  - `thresholds: Record<MetricKey, ThresholdConfig>`

- `ThresholdConfig`:
  - `enabled: boolean`
  - `min?: number`
  - `max?: number`

- `MetricKey` (string union o enum):
  - esempio: `"power_watts" | "temperature_celsius" | "vr_temperature_celsius" | "hashrate_ghs" | "fanspeed_rpm" | "shares_rejected"`

Compatibilita': tutto opzionale; default disabilitato.

## Persistenza (LevelDB)

- Global:
  - key: `settings:notifications` (db `pluto_core`)
- Per-device:
  - campo `notificationSettings` dentro record `devices:imprinted:<mac>`.

Nota: `@pluto/db updateOne()` fa shallow-merge; evitare update con oggetti completi stantii.

## Backend: API

### Settings globali notifiche

- `GET /settings/notifications`
  - ritorna `NotificationSettings`
  - NON ritorna `password/token` in chiaro (solo `hasPassword/hasToken`)
- `PUT /settings/notifications`
  - salva settings
  - merge credenziali: se `password/token` non presenti, mantenere quelle esistenti
- `POST /settings/notifications/test`
  - invia test su canali abilitati

### Device notification settings

- `PATCH /devices/imprint/:id/notification-settings`
  - aggiorna solo `notificationSettings` del device
  - non tocca `info`/system

### Webhook Alertmanager

- `POST /alerts/alertmanager`
  - riceve payload firing/resolved
  - formatta messaggio
  - invia via ntfy (e in futuro altri canali)

Sicurezza consigliata:

- shared secret via header `Authorization: Bearer ...` (configurato in Alertmanager e backend env)

## Backend: ntfy sender

- `POST ${serverUrl}/${topic}` body: testo
- Headers: `Title`, `Priority`, `Tags` (opzionali)
- Auth:
  - basic: `Authorization: Basic ...`
  - token: `Authorization: Bearer ...`
- Mai loggare credenziali.
- Redaction: estendere `backend/src/utils/redact-secrets.ts` per rimuovere campi credenziali.

## Fix necessario: evitare clobber delle impostazioni device

Problema:

- `backend/src/services/tracing.service.ts` fa `updateOne(..., extendedDevice)` e puo' sovrascrivere campi configurati dall'utente.

Fix:

- nel polling success aggiornare solo:
  - `{ tracing: true, info: normalizedInfo }`
- nel polling failure (gia' presente):
  - `{ tracing: false }`

Questo evita di sovrascrivere `notificationSettings` (e future impostazioni).

## Metriche Prometheus (label-based + threshold)

Mantenere le metriche esistenti `${hostname}_*` per compat.

Aggiungere nuove metriche (in `backend/src/services/metrics.service.ts`):

### Stato/valori

- `pluto_device_online{device_mac, device_hostname} = 0|1`
- `pluto_device_metric{device_mac, device_hostname, metric} = number`

Mappatura consigliata da `DeviceInfo`:

- `power_watts` -> `info.power`
- `temperature_celsius` -> `info.temp`
- `vr_temperature_celsius` -> `info.vrTemp`
- `hashrate_ghs` -> `info.hashRate ?? info.hashRate_10m`
- `fanspeed_rpm` -> `info.fanSpeedRpm ?? info.fanrpm ?? info.fanspeed`
- `shares_rejected` -> `info.sharesRejected`

### Gating notifiche

- `pluto_device_notifications_enabled{device_mac, device_hostname} = 0|1`

### Soglie

- `pluto_threshold_max{device_mac, device_hostname, metric} = number` (solo se enabled+max)
- `pluto_threshold_min{device_mac, device_hostname, metric} = number` (solo se enabled+min)

Quando una soglia viene rimossa/disabilitata:

- rimuovere la serie label (preferito), oppure impostarla a 0 e aggiungere una label `enabled` (alternativa).

## Prometheus rules (statiche)

Nuovo file: `prometheus/rules/pluto-device-alerts.yml` e copia in umbrel data.

Pattern PromQL (esempi):

- Offline (gating `notifications_enabled`):
  - `pluto_device_online == 0 AND on(device_mac) pluto_device_notifications_enabled == 1`

- Temp high:
  - `pluto_device_metric{metric="temperature_celsius"} > on(device_mac,metric) pluto_threshold_max{metric="temperature_celsius"}`
  - AND `pluto_device_online == 1`
  - AND `pluto_device_notifications_enabled == 1`

- Hashrate low:
  - `pluto_device_metric{metric="hashrate_ghs"} < on(device_mac,metric) pluto_threshold_min{metric="hashrate_ghs"}`
  - AND gating online + enabled

`for:`:

- v1: usare `for:` globale per ciascun alert (es. 2m). Non per-device.

## Alertmanager

Aggiungere servizio `alertmanager` (prom/alertmanager) in:

- `docker-compose.dev.local.yml`
- `docker-compose.next.local.yml`
- `docker-compose.release.local.yml`
- `umbrel-apps/pluto*/docker-compose.yml`

Config `alertmanager.yml`:

- receiver webhook verso backend:
  - `url: http://backend:<port>/alerts/alertmanager`
  - dove `<port>` e' 7776 (dev/stable) o 7676 (next)
- grouping:
  - `group_by: [alertname, device_mac]`
  - `group_wait`, `group_interval`, `repeat_interval`

## Prometheus config update

Aggiornare:

- `prometheus/prometheus.yml`
- `prometheus/prometheus.next.yml`
- `prometheus/prometheus.release.yml`
- `umbrel-apps/pluto*/data/prometheus/prometheus.yml`

Aggiungere:

- `rule_files: ["/etc/prometheus/rules/*.yml"]`
- `alerting.alertmanagers` -> `alertmanager:9093`
- mount rules in docker compose:
  - `./prometheus/rules:/etc/prometheus/rules:ro`

## Frontend

### Settings (global notifications)

File: `frontend/src/app/(static)/settings/SettingsClient.tsx`

- Sezione "Notifications"
- Provider selector (solo ntfy attivo, altri placeholder)
- Form ntfy: enable, serverUrl, topic, auth type, username/password o token
- Pulsanti: Save (PUT), Test (POST)

### Device Settings (per-device thresholds)

File: `frontend/src/components/Accordion/DeviceSettingsAccordion.tsx` (dentro AccordionItem)

- Sezione "Notifications":
  - toggle enable per-device
  - toggle offline
  - controlli soglia per metriche (min/max) + enable per metrica
  - Save notifications (PATCH device notification-settings)

## Test

Backend:

- test per settings notifications (no secrets in GET, merge in PUT)
- test webhook alertmanager -> ntfy sender (mock HTTP)
- test endpoint device notification-settings
- estendere test `metrics.service` per nuove metriche label-based e soglie

Frontend:

- estendere `SettingsClient.test.tsx` per sezione Notifications
- test minimo di salvataggio notification settings in `DeviceSettingsAccordion`

## Rollout / sequencing (ordine consigliato)

1. Tipi `common/interfaces`
2. Backend: settings notifications + ntfy sender + redaction
3. Backend: endpoint device notification-settings
4. Fix polling `tracing.service` (update minimale)
5. Metriche label-based + soglie
6. Prometheus rules + Alertmanager service/config (dev + umbrel)
7. Frontend UI (settings + per-device)
8. Test + smoke test su `make up`

## Note / scelte v1

- Topic ntfy unico globale.
- `for:` degli alert: globale nelle regole (non per-device) per ridurre complessita'.
- Segreti canali in Pluto (DB), Alertmanager solo webhook.
