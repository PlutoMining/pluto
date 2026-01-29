# Observability + UI Migration Plan (Grafana removal)

_Last updated: 2026-01-14_

## Goals

- Remove Grafana as a runtime dependency.
- Keep Prometheus for time-series storage, with explicit retention limits to prevent disk growth.
- Replace Grafana-embedded dashboards with first-class React pages/components.
- Migrate UI from Chakra UI to shadcn/ui (Tailwind + Radix) and reimplement current UI.
- Reduce `"use client"` usage to the minimum required (Server Components first).
- Keep live updates via Socket.IO where currently used.

## Non-goals (for initial implementation)

- Changing the metrics produced by devices (except minimal fixes required for correctness/consistency).
- Introducing Grafana-like query builders or arbitrary PromQL UI.
- Adding a full design system rewrite beyond what is needed to match current UI.

## Key decisions

- **Prometheus access**: Option B — React calls the backend; backend proxies Prometheus HTTP API.
- **Prometheus retention**: `--storage.tsdb.retention.time=7d` and `--storage.tsdb.retention.size=5GB`.
- **Charts library**: Recharts (fallback to simple lists/metrics cards where needed).
- **Time range selector**: present on dashboards with a default range.
- **Theme modes**: `light` and `dark` only (no `system`).
- **Routes organization**: route groups for separating realtime/client-heavy areas.

## Current state

- Grafana removed from runtime (dev/release/Umbrel compose).
- Grafana removed from release tooling (scripts/docs) and repo service is deleted.
- Frontend dashboards are implemented as React pages (no iframes).
- Frontend calls Prometheus through backend proxy endpoints (Option B).
- Prometheus retention is capped (`7d` / `5GB`), preventing unbounded disk growth.

## Dashboard parity: Grafana → PromQL mapping

### Overview dashboard

- KPI/Stats
  - `total_hardware`
  - `hardware_online`
  - `hardware_offline`
  - `total_power_watts`
  - `total_efficiency`
  - `total_hashrate`
  - `total_hashrate/total_hardware`
- Firmware fragmentation
  - `firmware_version_distribution{version="..."}`
- Shares by pool
  - `shares_by_pool_accepted{pool="..."}`
  - `shares_by_pool_rejected{pool="..."}`

### Per-device dashboard

_Note: metric prefix uses sanitized hostname. The frontend must replicate `sanitizeHostname()` logic._

- Hashrate
  - `<host>_hashrate_ghs`
  - `avg_over_time(<host>_hashrate_ghs[$range])`
- Power
  - `<host>_power_watts`
- Efficiency
  - `<host>_power_watts/(<host>_hashrate_ghs/1000)`
- Temperature
  - `<host>_temperature_celsius`
- Fan
  - `<host>_fanspeed_rpm`
- Voltages
  - `<host>_core_voltage_actual_volts`
  - `<host>_core_voltage_volts`
  - `<host>_voltage_volts`

## Work plan (ordered)

### Phase 0 — UI foundation (shadcn + Tailwind)

**Outcome**: App renders with shadcn/Tailwind design tokens; Chakra usage is on the path to removal.

- Add Tailwind + PostCSS configuration in `frontend/`.
- Add shadcn/ui base setup (components under `frontend/src/components/ui/*`).
- Implement theming using CSS variables + `next-themes` with `light`/`dark` only.
- Map existing tokens:
  - Source: `frontend/src/theme/colors.ts` and semantic tokens in `frontend/src/theme/theme.ts`.
  - Convert to CSS vars and Tailwind theme.
- Add base primitives we will migrate to:
  - Button, Input, Select, Badge, Table, Dialog/Modal, Accordion, Tooltip, Progress/Spinner.

Acceptance criteria:
- A minimal page and layout renders using shadcn primitives.
- Dark/light switch works (without `system`).

### Phase 1 — Reduce `use client` (Server Components first)

**Outcome**: `use client` is present only in leaf interactive components.

- Create route groups:
  - `frontend/src/app/(realtime)/...` for pages needing socket/live updates.
  - `frontend/src/app/(static)/...` for pages that can be server-first.
- Move `SocketProvider` to `(realtime)` layout only.
- Convert pages currently doing `axios.get()` in `useEffect` to server-side fetch where possible.
- Use the pattern:
  - `page.tsx` (server) fetches initial data
  - `*Client.tsx` (client) handles socket updates, selections, and mutations

Acceptance criteria:
- The number of `"use client"` directives is reduced and limited to interactive leaf components.
- Realtime areas still receive socket updates.

### Phase 2 — Finish Chakra → shadcn migration

**Outcome**: ChakraProvider and Chakra packages removed from the frontend.

- Migrate:
  - `layout`, `NavBar`, `Footer`
  - shared components under `frontend/src/components/*`
  - pages under `frontend/src/app/*`
- Remove Chakra-only patterns:
  - `useToken`, `useDisclosure`, Chakra modal/accordion/table components.
- Delete Chakra theme files or keep only as reference until migration is complete.

Acceptance criteria:
- No `@chakra-ui/*` imports remain in `frontend/src`.
- `frontend/package.json` no longer depends on Chakra.

### Phase 3 — Prometheus proxy API (backend)

**Outcome**: Frontend can query Prometheus through backend endpoints.

- Add backend env:
  - `PROMETHEUS_HOST` (default `http://prometheus:9090`).
- Add backend routes:
  - `GET /prometheus/query`
  - `GET /prometheus/query_range`
  - (optional) `GET /prometheus/labels`, `GET /prometheus/label/:name/values`
- Add guard-rails:
  - max range window
  - min/max step
  - timeout
  - optional allowlist of query patterns

Acceptance criteria:
- Backend successfully proxies Prometheus queries (local dev stack).

### Phase 4 — Prometheus retention limits

**Outcome**: Prometheus disk usage is capped.

- Add to docker-compose stacks and Umbrel compose:
  - `--storage.tsdb.retention.time=7d`
  - `--storage.tsdb.retention.size=5GB`
- Optional: add scrape/label/sample limits in Prometheus config.

Acceptance criteria:
- Prometheus starts with retention flags enabled.

### Phase 5 — React dashboards (Recharts) with time range

**Outcome**: Grafana dashboards are replaced by native UI.

- Create a shared time-range selector component with a default (e.g. `1h`).
- Build a Prometheus client in the frontend that calls the backend proxy endpoints.
- Implement pages:
  - Overview dashboard replacement
    - KPI cards + time series
    - firmware fragmentation
    - shares by pool
  - Device dashboard replacement
    - charts listed in the mapping section
- Ensure hostname sanitization matches backend metric naming.

Acceptance criteria:
- Overview and per-device pages render charts without iframes.
- Range selection updates queries and charts.

### Phase 6 — Remove Grafana runtime and code paths

**Outcome**: Grafana service removed from runtime and repo is simplified.

- Frontend:
  - Remove `/grafana/*` rewrite from `frontend/src/middleware.ts`.
  - Remove usage of `GF_HOST`.
  - Remove iframe styling helpers.
- Backend:
  - Remove grafana service (`backend/src/services/grafana.service.ts`) and dashboards controller/routes.
  - Remove startup dashboard creation (`backend/src/index.ts`).
- Docker/Umbrel:
  - Remove `grafana` service and any init/volume references.
- Documentation:
  - Update docs and README references to Grafana.

Acceptance criteria:
- Dev/release/Umbrel stacks run without Grafana.
- No frontend pages depend on Grafana URLs.

## Technical notes / risks

- **Shares-by-pool metrics**: ensure we have consistent semantics for totals vs per-label time series.
  - Prefer per-label series and compute totals via PromQL `sum()`.
- **Recharts limits**: firmware treemap may require a fallback (list/table) if a treemap implementation is not satisfactory.
- **Security**: backend proxy must avoid becoming an open PromQL gateway (guard-rails and sensible defaults).

## Confirmation gate

Implementation started after explicit confirmation (2026-01-15).
