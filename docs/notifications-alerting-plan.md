# Notifications + Alerting (Prometheus + Alertmanager + Pluto)

## Objective

- Configure per-device notifications with metric thresholds (Device Settings).
- Configure global notification channel via ntfy (Settings).
- Use Prometheus + Alertmanager for alert state (firing/resolved).
- Use Pluto backend as channel dispatcher (ntfy today, extensible later).

## Architecture (high level)

1. Pluto backend:
   - Device polling (already in place).
   - Exposes `/metrics` (already in place).
   - Also exposes label-based per-device metrics and threshold metrics (new).
   - Receives webhook from Alertmanager and forwards to channels (new).
2. Prometheus:
   - Scrapes `backend:/metrics`.
   - Loads static alert rules.
   - Sends alerts to Alertmanager.
3. Alertmanager:
   - Groups/dedup/silence/repeat.
   - Sends webhook to Pluto backend.
4. Ntfy:
   - Pluto backend publishes to `${serverUrl}/${topic}`.

## Key principles

- Per-device thresholds do **not** generate dynamic rules:
  - thresholds are metrics (`pluto_threshold_*`) and PromQL joins on labels.
- Channel secrets (password/token) stay in Pluto (DB/env), not in Alertmanager/Prometheus.
- UI is prepared for multiple providers, but only `ntfy` is implemented.

## Data model (common/interfaces)

Add `common/interfaces/notifications.interface.ts` and export it from `common/interfaces/index.ts`.

### Global settings

- `NotificationSettings`:
  - `enabled: boolean`
  - `channels: NotificationChannel[]`

- `NotificationChannel` (union, extensible):
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

Extend `Device` in `common/interfaces/device-info.interface.ts` with:

- `notificationSettings?: DeviceNotificationSettings`

- `DeviceNotificationSettings`:
  - `enabled: boolean`
  - `offline: { enabled: boolean }`
  - `thresholds: Record<MetricKey, ThresholdConfig>`

- `ThresholdConfig`:
  - `enabled: boolean`
  - `min?: number`
  - `max?: number`

- `MetricKey` (string union or enum):
  - e.g. `"power_watts" | "temperature_celsius" | "vr_temperature_celsius" | "hashrate_ghs" | "fanspeed_rpm" | "shares_rejected"`

Compatibility: all optional; default disabled.

## Persistence (LevelDB)

- Global:
  - key: `settings:notifications` (db `pluto_core`)
- Per-device:
  - field `notificationSettings` inside record `devices:imprinted:<mac>`.

Note: `@pluto/db updateOne()` does shallow-merge; avoid updates with full stale objects.

## Backend: API

### Global notification settings

- `GET /settings/notifications`
  - returns `NotificationSettings`
  - does **not** return `password/token` in plain text (only `hasPassword/hasToken`)
- `PUT /settings/notifications`
  - saves settings
  - merges credentials: if `password/token` not provided, keep existing ones
- `POST /settings/notifications/test`
  - sends test to enabled channels

### Device notification settings

- `PATCH /devices/imprint/:id/notification-settings`
  - updates only the device's `notificationSettings`
  - does not touch `info`/system

### Alertmanager webhook

- `POST /alerts/alertmanager`
  - receives firing/resolved payload
  - formats message
  - sends via ntfy (and future channels)

Recommended security:

- shared secret via header `Authorization: Bearer ...` (configured in Alertmanager and backend env)

### Alertmanager: routes and contracts

**Does Alertmanager expose routes?** Yes. Prometheus Alertmanager exposes an HTTP API (v2) with a published [OpenAPI spec](https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml):

- **Management**: `GET /-/healthy`, `GET /-/ready`, `POST /-/reload`
- **API v2** (base path `/api/v2/`): `GET /status`, `GET /receivers`, `GET/POST /alerts`, `GET /alerts/groups`, `GET/POST /silences`, `GET/DELETE /silence/{silenceID}`

**Contracts (like pyasic-bridge)?** Two directions:

1. **Inbound (Alertmanager → Pluto)**  
   Alertmanager sends a webhook to our `POST /alerts/alertmanager`. The request body is the [Alertmanager webhook payload](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config) (list of alerts with status, labels, annotations). We should define **inbound types** (e.g. in `common/interfaces` or `backend` types) for this payload so the backend parses and validates it in a typed way. No separate client package: we own the endpoint and only need the request body shape.

2. **Outbound (Pluto → Alertmanager)**  
   If we add features that **call** Alertmanager (e.g. list active alerts, list/create/delete silences, show status in the UI), we can introduce an **Alertmanager client** with explicit contracts:
   - **Option A**: Add `common/alertmanager-client` generated from the official Alertmanager OpenAPI (similar to `common/pyasic-bridge-client` from pyasic-bridge’s OpenAPI). Gives typed `getAlerts()`, `getSilences()`, `postSilences()`, etc.
   - **Option B**: Use the OpenAPI spec only for reference and hand-write a thin client and types for the subset of endpoints we need.

Recommendation: define **inbound webhook types** as part of the notifications work (so the alertmanager webhook handler is typed and testable). Add an **outbound client** only when we implement features that call Alertmanager (e.g. alerts/silences UI or API).

## Backend: ntfy sender

- `POST ${serverUrl}/${topic}` body: text
- Headers: `Title`, `Priority`, `Tags` (optional)
- Auth:
  - basic: `Authorization: Basic ...`
  - token: `Authorization: Bearer ...`
- Never log credentials.
- Redaction: extend `backend/src/utils/redact-secrets.ts` to strip credential fields.

## Required fix: avoid clobbering device settings

Problem:

- `backend/src/services/tracing.service.ts` does `updateOne(..., extendedDevice)` and can overwrite user-configured fields.

Fix:

- on successful polling, update only:
  - `{ tracing: true, info: normalizedInfo }`
- on polling failure (already present):
  - `{ tracing: false }`

This prevents overwriting `notificationSettings` (and future settings).

## Prometheus metrics (label-based + threshold)

Keep existing `${hostname}_*` metrics for compatibility.

Add new metrics (in `backend/src/services/metrics.service.ts`):

### State/values

- `pluto_device_online{device_mac, device_hostname} = 0|1`
- `pluto_device_metric{device_mac, device_hostname, metric} = number`

Suggested mapping from `DeviceInfo`:

- `power_watts` -> `info.power`
- `temperature_celsius` -> `info.temp`
- `vr_temperature_celsius` -> `info.vrTemp`
- `hashrate_ghs` -> `info.hashRate ?? info.hashRate_10m`
- `fanspeed_rpm` -> `info.fanSpeedRpm ?? info.fanrpm ?? info.fanspeed`
- `shares_rejected` -> `info.sharesRejected`

### Notification gating

- `pluto_device_notifications_enabled{device_mac, device_hostname} = 0|1`

### Thresholds

- `pluto_threshold_max{device_mac, device_hostname, metric} = number` (only if enabled+max)
- `pluto_threshold_min{device_mac, device_hostname, metric} = number` (only if enabled+min)

When a threshold is removed/disabled:

- remove the label series (preferred), or set it to 0 and add an `enabled` label (alternative).

## Prometheus rules (static)

New file: `prometheus/rules/pluto-device-alerts.yml` and copy into umbrel data.

PromQL patterns (examples):

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

- v1: use a global `for:` per alert (e.g. 2m). Not per-device.

## Alertmanager

Add `alertmanager` service (prom/alertmanager) in:

- `docker-compose.dev.local.yml`
- `docker-compose.next.local.yml`
- `docker-compose.release.local.yml`
- `umbrel-apps/pluto*/docker-compose.yml`

Config `alertmanager.yml`:

- receiver webhook to backend:
  - `url: http://backend:<port>/alerts/alertmanager`
  - where `<port>` is 7776 (dev/stable) or 7676 (next)
- grouping:
  - `group_by: [alertname, device_mac]`
  - `group_wait`, `group_interval`, `repeat_interval`

## Prometheus config update

Update:

- `prometheus/prometheus.yml`
- `prometheus/prometheus.next.yml`
- `prometheus/prometheus.release.yml`
- `umbrel-apps/pluto*/data/prometheus/prometheus.yml`

Add:

- `rule_files: ["/etc/prometheus/rules/*.yml"]`
- `alerting.alertmanagers` -> `alertmanager:9093`
- mount rules in docker compose:
  - `./prometheus/rules:/etc/prometheus/rules:ro`

## Frontend

### Settings (global notifications)

File: `frontend/src/app/(static)/settings/SettingsClient.tsx`

- "Notifications" section
- Provider selector (only ntfy active, others placeholder)
- Ntfy form: enable, serverUrl, topic, auth type, username/password or token
- Buttons: Save (PUT), Test (POST)

### Device Settings (per-device thresholds)

File: `frontend/src/components/Accordion/DeviceSettingsAccordion.tsx` (inside AccordionItem)

- "Notifications" section:
  - per-device enable toggle
  - offline toggle
  - threshold controls per metric (min/max) + enable per metric
  - Save notifications (PATCH device notification-settings)

## Tests

Backend:

- tests for notification settings (no secrets in GET, merge in PUT)
- test Alertmanager webhook -> ntfy sender (mock HTTP)
- test device notification-settings endpoint
- extend `metrics.service` tests for new label-based metrics and thresholds

Frontend:

- extend `SettingsClient.test.tsx` for Notifications section
- minimal test for saving notification settings in `DeviceSettingsAccordion`

## Rollout / sequencing (recommended order)

1. `common/interfaces` types
2. Backend: notification settings + ntfy sender + redaction
3. Backend: device notification-settings endpoint
4. Fix polling in `tracing.service` (minimal update)
5. Label-based metrics + thresholds
6. Prometheus rules + Alertmanager service/config (dev + umbrel)
7. Frontend UI (settings + per-device)
8. Tests + smoke test on `make up`

## Notes / v1 choices

- Single global ntfy topic.
- Alert `for:` global in rules (not per-device) to reduce complexity.
- Channel secrets in Pluto (DB); Alertmanager only for webhook.
