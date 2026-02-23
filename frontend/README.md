# Frontend Tooling Guide

This application reuses the shared configs in `tooling/`:

- `tooling/eslint.base.cjs` → consumed by `.eslintrc.cjs`
- `tooling/jest.base.cjs` → imported by `jest.config.cjs`
- `tooling/tsconfig.base.json` → extended in `tsconfig.json`

## Local commands

```bash
cd frontend
npm run lint         # check
npm run lint:fix     # auto-fix
npm run test         # jest (jsdom)
npm run test:watch
npm run test:coverage
```

## Continuous Integration

`.github/workflows/frontend.yml` installs shared `common/*` packages, runs `npm ci` in `frontend`, then executes `npm run lint` and `npm run test` for every push/PR. Update `APP_LIST` in the PR workflow if additional apps need the same treatment.

## SV2 Integration

### Device Settings UI

When configuring a device with SV2 protocol version:
- The UI shows an "Authority Key (V2)" field for entering the base58-check encoded authority public key
- A helper message indicates that SV2 devices automatically route through translator/JDC
- The device will connect to the translator (SV1) or JDC (SV2) service, which forwards to the target SV2 pool

### Protocol Version Selection

Devices can be configured with either:
- **V1**: Direct connection to SV1 pools
- **V2**: Routed through translator/JDC to SV2 pools

The protocol version is auto-detected from the URL format when a V2 URL (`stratum2+tcp://...`) is entered.

