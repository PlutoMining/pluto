# Backend Tooling Guide

This service consumes the shared configs under `tooling/` so every app can reuse
the same lint/test defaults:

- `tooling/eslint.base.cjs` – exported object consumed by `.eslintrc.cjs`
- `tooling/jest.base.cjs` – preset used by `jest.config.cjs`
- `tooling/tsconfig.base.json` – baseline compiler options extended by
  `tsconfig.json`

When other apps (e.g., discovery or frontend) adopt the same modernization they
only need to point their config files to the shared ones and add local tweaks.

## Local commands

Run ESLint (auto-fix optional):

```bash
cd backend
npm run lint         # check
npm run lint:fix     # fix
```

Run the Jest suite with coverage (80% global gate enforced on the files that are
currently under test):

```bash
cd backend
npm run test         # single run
npm run test:watch   # watch mode
npm run test:coverage
```

## Continuous Integration

`.github/workflows/backend.yml` runs on every push/PR. It installs dependencies,
executes `npm run lint`, then `npm run test`. The job already uses a matrix with
one entry (`backend`) so other apps can join the same workflow by simply adding
their folder name to the matrix list.

## SV2 Integration

### Translator Proxy (tProxy)

The backend automatically routes SV2 devices through the translator proxy service when `stratumProtocolVersion` is set to `'v2'`. The translator bridges SV1 miners to SV2 pools.

**Configuration:**
- Translator config path: `/etc/translator/tproxy-config.toml` (default)
- Upstream port: `34254` (where miners connect as SV1)
- Config is automatically updated when devices are configured with SV2 settings

**Environment Variables:**
- `TRANSLATOR_CONFIG_PATH`: Path to translator config file (default: `/etc/translator/tproxy-config.toml`)
- `ENABLE_TRANSLATOR`: Enable/disable translator (default: enabled)
- `TRANSLATOR_HOST`: Translator service host (default: `localhost`)
- `TRANSLATOR_PORT`: Translator service port (default: `34254`)

**API Endpoints:**
- `GET /api/translator/status` - Get translator service status

### Job Declarator Client (JDC)

JDC improves efficiency and decentralization by allowing miners to declare their own jobs. Enable JDC by setting `ENABLE_JDC=true`.

**Configuration:**
- JDC config path: `/etc/jdc/jdc-config.toml` (default)
- Upstream port: `34255` (where miners connect as SV2)
- Config is automatically updated when devices are configured with SV2 settings

**Environment Variables:**
- `JDC_CONFIG_PATH`: Path to JDC config file (default: `/etc/jdc/jdc-config.toml`)
- `ENABLE_JDC`: Enable/disable JDC (default: `false`)
- `JDC_HOST`: JDC service host (default: `localhost`)
- `JDC_PORT`: JDC service port (default: `34255`)

**API Endpoints:**
- `GET /api/jdc/status` - Get JDC service status

### Device Routing Logic

When a device is configured with SV2:
1. Backend parses the SV2 URL to extract pool host, port, and authority key
2. Updates translator/JDC configuration with pool settings
3. Routes device to connect to translator (SV1) or JDC (SV2) instead of direct pool
4. Translator/JDC forwards connections to the target SV2 pool

**Service Selection:**
- If `ENABLE_JDC=true`: Device connects to JDC as SV2
- Otherwise: Device connects to translator as SV1 (translator converts to SV2)

