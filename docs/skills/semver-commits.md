# SemVer / Conventional Commits (Pluto)

This repo derives SemVer bumps and changelogs from **Conventional Commits**.

References in this repo:
- Commit message validation: `.commitlintrc.json` + `.husky/commit-msg`
- Changelog rules: `docs/release/changelog.md`
- Per-service bump logic used by release scripts: `scripts/lib/semver.sh`

## Required format

```
<type>[optional scope][!]: <subject>

[optional body]

[optional footer(s)]
```

Guidelines (matches current commitlint rules):
- Keep the header `<= 100` characters.
- Subject is required, **no trailing period**, prefer lower-case imperative (avoid Sentence Case).

## Allowed types

These are enforced (see `.commitlintrc.json`):

- `feat`  (feature)
- `fix`   (bug fix)
- `docs`  (docs only)
- `style` (formatting, no logic)
- `refactor`
- `perf`
- `test`
- `build`
- `ci`
- `chore`
- `revert`

## Scopes (recommended)

Scopes are optional but help both humans and the release tooling.

Common scopes used in release docs:
- `backend`, `frontend`, `discovery`, `prometheus`, `mock`, `pyasic-bridge`
- `common`
- `scripts`
- `docs`
- `release`

Multiple scopes are allowed by commitlint; use comma-separated lists:

```
feat(frontend,backend): add realtime status
```

## SemVer mapping in this repo

When you run `scripts/release.sh --bump-version` or `scripts/beta-release.sh --bump-version`, the bump level is computed **per service** from commit history (see `scripts/lib/semver.sh`).

According to the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/):

- `major`:
  - `type(scope)!: ...` for a scope that includes the service, OR
  - a `BREAKING CHANGE:` footer *and* a header scope that includes the service
- `minor`: any `feat(...)` touching that service
- `patch`: any `fix(...)` touching that service
- `none`: no commits touching that service directory, or only non-versioned types (docs, build, ci, chore, style, refactor, perf, test, revert)

Important nuance: a breaking change footer only counts as `major` for a service if the **header scope mentions that service** (e.g. `feat(frontend,backend)!: ...` is major for `frontend` + `backend`, not for `discovery`).

**Note**: Only `feat:` and `fix:` commit types trigger automatic version bumps. Other types (docs, build, ci, chore, style, refactor, perf, test, revert) do not trigger version bumps unless they include a `BREAKING CHANGE`.

## Examples

```bash
# Feature (minor)
git commit -m "feat(frontend): add hashrate chart"

# Fix (patch)
git commit -m "fix(backend): handle null device name"

# Breaking change (major)
git commit -m "feat(frontend,backend)!: change api response shape"

# Breaking change via footer (major)
git commit -m "feat(backend): update api\n\nBREAKING CHANGE: response payload renamed from x to y"
```

## Helper script

Use the interactive helper:

```bash
npm run commit
```

It helps compose valid Conventional Commit headers (type/scope/subject) and can add a `BREAKING CHANGE:` footer.
