# Pluto Agent Guide (AGENTS.md)

This is a small TypeScript monorepo for the Pluto mining management platform.

## Repo Layout

- `backend/`: Express API + socket.io + Prometheus proxy/metrics
- `discovery/`: Express service that discovers devices on LAN
- `frontend/`: Next.js 14 UI (App Router)
- `common/*`: shared packages used via local `file:` deps (`@pluto/*`)
- `mock/`: mock device server
- `prometheus/`: Prometheus image wrapper/config
- `tooling/`: shared Jest/ESLint/TS config

## Tooling / Versions

- CI uses Node `20` (see `.github/workflows/*.yml`). Prefer Node 20 locally.
- Package manager: `npm` (each package has its own `package-lock.json`).
- ESLint is run in legacy mode via `ESLINT_USE_FLAT_CONFIG=false`.

## Setup / Dev Environment

Recommended (runs full stack):

- `make setup` (creates `data/` dirs + copies `.env.tpl` -> `.env.local` per service)
- `make up` / `make down`
- `make logs SERVICE=backend`

Fast local iteration (single service):

- `npm ci --prefix backend` / `discovery` / `frontend`
- `npm --prefix backend run dev` (or `dev:debug`)
- `npm --prefix discovery run dev` (or `dev:debug`)
- `npm --prefix frontend run dev`

Shared packages (local installs/builds):

- Backend helper: `npm --prefix backend run common:install` and `npm --prefix backend run common:build`
- Otherwise build explicitly:
  - `npm ci --prefix common/utils && npm --prefix common/utils run build`
  - `npm ci --prefix common/db && npm --prefix common/db run build`
  - `npm ci --prefix common/interfaces && npm --prefix common/interfaces run build`
  - `npm ci --prefix common/logger && npm --prefix common/logger run build`

Note: `frontend/.env.local` is intentionally gitignored; don’t commit it.

## Build / Lint / Test

Build:

- Backend: `npm --prefix backend run build` (also builds `common/*` via `common:build`)
- Discovery: `npm --prefix discovery run build`
- Frontend: `npm --prefix frontend run build` (Next build; includes lint unless `--no-lint`)
- Mock: `npm --prefix mock run build`

Lint:

- Backend: `npm --prefix backend run lint` (fix: `npm --prefix backend run lint:fix`)
- Discovery: `npm --prefix discovery run lint` (fix: `npm --prefix discovery run lint:fix`)
- Frontend: `npm --prefix frontend run lint` (fix: `npm --prefix frontend run lint:fix`)
- All apps (Makefile): `make lint-apps` (single: `make lint-app APP=backend`)

Tests (Jest):

- Backend: `npm --prefix backend test`
- Discovery: `npm --prefix discovery test`
- Frontend: `npm --prefix frontend test`
- common/utils: `npm --prefix common/utils test`
- All apps (root scripts): `npm run test:all`
- All apps (Makefile): `make test-apps` (single: `make test-app APP=frontend`)

Coverage:

- `npm --prefix backend run test:coverage`
- `npm --prefix discovery run test:coverage`
- `npm --prefix frontend run test:coverage`

### Run A Single Test File

Prefer `--runTestsByPath` (most explicit):

- Backend:
  - `npm --prefix backend test -- --runTestsByPath src/__tests__/services/device.service.test.ts`
- Discovery:
  - `npm --prefix discovery test -- --runTestsByPath src/__tests__/services/discovery.service.test.ts`
- Frontend:
  - `npm --prefix frontend test -- --runTestsByPath src/__tests__/app/OverviewClient.test.tsx`
- common/utils:
  - `npm --prefix common/utils test -- --runTestsByPath __tests__/strings.test.ts`

### Run A Single Test By Name

- `npm --prefix backend test -- -t "redacts secrets"`
- `npm --prefix frontend test -- -t "renders"`

### List Matching Tests

- `npm --prefix backend test -- --listTests`

### Watch Mode

- `npm --prefix backend run test:watch`
- `npm --prefix discovery run test:watch`
- `npm --prefix frontend run test:watch`

## TypeScript / Module Resolution

- Base TS config: `tooling/tsconfig.base.json` (`strict: true`, `esModuleInterop: true`).
- Path alias `@/*` maps to `src/*` in `backend/`, `discovery/`, and `frontend/`.
- Shared packages are imported as `@pluto/*` (local `file:` deps).

## Code Style Guidelines

Formatting:

- Match existing file style.
- Common patterns: 2-space indentation, semicolons, double quotes.
- No repo-level Prettier config; ESLint uses `eslint-config-prettier` to avoid conflicts.

Imports:

- Prefer `import type { X } from "..."` for type-only imports.
- Prefer `@/…` over deep relative imports when an alias exists.
- Typical grouping (match surrounding code): built-ins, third-party, `@pluto/*`, `@/`, relative.

Naming / File conventions:

- Types/interfaces: `PascalCase`; variables/functions: `camelCase`; true constants: `UPPER_SNAKE_CASE`.
- Backend/discovery filenames commonly use `kebab-case.ts` (e.g. `devices.routes.ts`).
- Backend/discovery structure commonly follows `routes/` -> `controllers/` -> `services/`.
- Frontend components are generally `PascalCase.tsx`.

Types / safety:

- Keep types narrow; avoid widening to `string | number | any`.
- Avoid `any` in new code unless at an external boundary (then isolate it and validate/sanitize).
- Prefer domain types from `@pluto/interfaces` for API payloads and device models.

Error handling / logging / secrets:

- Prefer `logger` from `@pluto/logger` over `console.*`.
- Controllers (Express) should validate inputs at the boundary, `try/catch` async work, and return appropriate HTTP codes.
- Don’t log secrets. Backend uses `removeSecretsMiddleware` and `redactSecrets` to reduce leakage.

Tests:

- Jest + `ts-jest` is standard (`tooling/jest.base.cjs`).
- Locations:
  - backend/discovery: `src/__tests__/**/*.test.ts`
  - frontend: `src/__tests__/**/*.test.tsx` (React Testing Library)
  - common/utils: `__tests__/**/*.test.ts`
- Frontend test setup is `frontend/jest.setup.ts` (jest-dom + DOM polyfills + module mocks).

## CI / Release / Commits

CI (per-service workflows) generally runs: `npm ci` -> `npm run lint` -> `npm run build` -> `npm run test`.

Commits:

- Commit messages are enforced by commitlint (`.husky/commit-msg`, `.commitlintrc.json`).
- Conventional Commits required (`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert` + known scopes).

Helper:

- Interactive Conventional Commit helper: `npm run commit` (see `docs/skills/semver-commits.md`).

## Cursor / Copilot Rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` present in this repo.
