# Changelog Generation

The release scripts automatically generate changelogs from conventional commits using [semantic-release](https://semantic-release.gitbook.io/). This happens automatically after successful stable releases.

## How It Works

### For Stable Releases

After a successful release on the `main` branch, the scripts automatically:

1. Analyze commits since the last release tag (or all commits if no tags exist yet)
2. Generate `CHANGELOG.md` based on conventional commit messages
3. Create a git tag (e.g., `v1.0.0`) to mark the release
4. **Leave changelog uncommitted** (uses `--skip-commit` to work with protected branches)
5. Optionally create a GitHub release with the changelog

**Note**: The changelog is generated but not committed automatically. All release changes (package.json, manifests, CHANGELOG.md) are left uncommitted for PR workflow. See [Stable Releases](./stable-releases.md) for the complete post-release workflow.

### Preventing Duplicates

Semantic-release uses **git tags** to track what's been released:

- The first time it runs (if no tags exist), it analyzes all commits from the start
- After the first release, it creates a tag (e.g., `v1.0.0`)
- The next time it runs, it **only analyzes commits after the last tag**
- This ensures no duplicate changelog entries

**Example workflow**:
1. First release: Analyzes all commits → Creates tag `v1.0.0` → Generates changelog
2. Second release: Analyzes commits after `v1.0.0` → Creates tag `v1.1.0` → Appends to changelog
3. Third release: Analyzes commits after `v1.1.0` → Creates tag `v1.2.0` → Appends to changelog

### For Beta Releases

**Changelog generation is skipped for beta releases.** This prevents duplicate entries when the branch is later merged to `main` and a stable release is made. The changelog is only generated on stable releases (on `main` branch) after PR merge.

## Squash-and-Merge Workflow

Since you use squash-and-merge for PRs, semantic-release analyzes the **squashed commit message** on `main`. To ensure proper changelog generation:

- **PR titles must follow conventional commits format** (e.g., `feat(backend): add new feature`)
- The squashed commit message will be the PR title
- Semantic-release runs on `main` after the merge
- Individual commits in the PR don't need to follow conventional commits (only the PR title matters)

**Example PR title**:
```
feat(backend): add user authentication endpoint
```

This will be analyzed by semantic-release as a `feat` type commit, triggering a minor version bump in the changelog.

## Standalone Changelog Generation

You can also generate the changelog independently:

```bash
# Preview what would be generated (dry-run)
# Note: Works on any branch for testing purposes
scripts/generate-changelog.sh --dry-run

# Generate changelog without committing (must be on main branch)
# This is the default behavior when called from release.sh
scripts/generate-changelog.sh --skip-commit

# Generate and commit changelog (must be on main branch)
# Note: This will fail on protected branches - use --skip-commit instead
scripts/generate-changelog.sh
```

**Important**: When called from `release.sh`, changelog generation uses `--skip-commit` by default to work with protected branches. All changes are left uncommitted for PR workflow.

### Testing Changelog Generation

To test how semantic-release would analyze your commits, use `--dry-run` mode. This works on any branch:

```bash
# Test on your feature branch
scripts/generate-changelog.sh --dry-run
```

The dry-run mode will:
- Show what version would be released
- Show what changelog entries would be generated
- Show what commits would be analyzed
- **Not make any changes** to files or git

For actual changelog generation, you must be on the `main` branch.

## Conventional Commits

To ensure proper changelog generation, all commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- `feat`: A new feature (triggers minor version bump in changelog)
- `fix`: A bug fix (triggers patch version bump in changelog)
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi colons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Scopes

Scopes are optional but recommended. Valid scopes for this project:

- `backend`, `frontend`, `discovery`, `grafana`, `prometheus`, `mock` - Service-specific changes
- `common` - Changes to shared/common code
- `scripts` - Changes to release/utility scripts
- `docs` - Documentation changes
- `release` - Release-related changes

### Examples

```bash
# Feature with scope
git commit -m "feat(backend): add user authentication endpoint"

# Bug fix
git commit -m "fix(frontend): resolve login form validation bug"

# Breaking change (use ! after type)
git commit -m "feat(backend)!: change API response format"

# Or use BREAKING CHANGE footer
git commit -m "feat(backend): update API

BREAKING CHANGE: API response format has changed from JSON to YAML"

# Documentation
git commit -m "docs: update release flow documentation"

# Multiple services
git commit -m "feat(backend,frontend): add real-time notifications"
```

## Commit Message Validation

Commit messages are automatically validated using [commitlint](https://commitlint.js.org/) with Git hooks (via [husky](https://typicode.github.io/husky/)).

**To bypass validation** (not recommended):
```bash
git commit --no-verify -m "your message"
```

**To set up Git hooks** (run once after cloning):
```bash
npm install
npm run prepare  # Sets up husky hooks
```

## Changelog Format

The generated changelog follows this format:

```markdown
## [1.2.0] - 2024-01-15

### Features
* **backend**: add user authentication endpoint
* **frontend**: add real-time notifications

### Bug Fixes
* **frontend**: resolve login form validation bug

### Documentation
* update release flow documentation
```

## Skipping Changelog Generation

You can skip changelog generation for stable releases:

```bash
scripts/release.sh --skip-changelog --bump-version
```

This is useful if you want to generate the changelog manually or at a different time.
