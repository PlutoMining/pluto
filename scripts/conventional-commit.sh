#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/conventional-commit.sh [--no-edit] [--dry-run]

Interactive Conventional Commit helper for Pluto.

Notes:
- Does NOT stage files; run `git add ...` first.
- By default opens your git editor for body/footer editing.
- Commit types show their SemVer bump level: (minor), (patch), (none), or (major) with breaking changes.

Options:
  --no-edit   Create commit without opening editor
  --dry-run   Print the commit message and exit
  -h, --help  Show this help
EOF
}

NO_EDIT=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-edit) NO_EDIT=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository." >&2
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes." >&2
  echo "Stage changes first, e.g. 'git add -A', then run this again." >&2
  exit 1
fi

# Base types without bump indicators
types=(feat fix docs style refactor perf test build ci chore revert)

# Map types to their bump levels according to Conventional Commits spec
# Only feat and fix have implicit SemVer bumps; others require BREAKING CHANGE
# See: https://www.conventionalcommits.org/en/v1.0.0/
declare -A type_bumps=(
  [feat]="minor"      # New features → MINOR bump
  [fix]="patch"       # Bug fixes → PATCH bump
  [docs]="none"       # Documentation only (no version bump)
  [style]="none"      # Code style/formatting (no version bump)
  [refactor]="none"   # Code refactoring (no version bump)
  [perf]="none"       # Performance improvements (no version bump)
  [test]="none"       # Test changes (no version bump)
  [build]="none"      # Build system changes (no version bump)
  [ci]="none"         # CI configuration changes (no version bump)
  [chore]="none"      # Maintenance tasks (no version bump)
  [revert]="none"     # Reverts (no version bump, unless reverting a breaking change)
)

# Create display array with bump indicators
types_display=()
for t in "${types[@]}"; do
  bump="${type_bumps[$t]}"
  types_display+=("${t} (${bump})")
done

scopes=(backend frontend discovery prometheus mock pyasic-bridge common scripts docs release)

pick_from_list() {
  local prompt="$1"; shift
  local -a items=("$@")
  local selection

  # Print interactive prompt to stderr so command substitution captures only the chosen value.
  echo "$prompt" >&2
  select selection in "${items[@]}"; do
    if [[ -n "${selection:-}" ]]; then
      echo "$selection"
      return 0
    fi
    echo "Invalid selection." >&2
  done
}

type_with_bump=$(pick_from_list "Select commit type:" "${types_display[@]}")
# Extract just the type name (before the space and parentheses)
type="${type_with_bump%% (*}"

echo
echo "Common scopes: ${scopes[*]}"
read -r -p "Scope (optional, comma-separated): " scope
scope=$(echo "${scope}" | tr -d ' ')

echo
read -r -p "Breaking change? [y/N]: " breaking
breaking=$(echo "${breaking}" | tr '[:upper:]' '[:lower:]')

bang=""
breaking_footer=""
if [[ "${breaking}" == "y" || "${breaking}" == "yes" ]]; then
  bang="!"
  read -r -p "BREAKING CHANGE description (recommended): " breaking_desc
  breaking_desc=${breaking_desc:-}
  if [[ -n "${breaking_desc}" ]]; then
    breaking_footer="BREAKING CHANGE: ${breaking_desc}"
  else
    breaking_footer="BREAKING CHANGE: <describe the breaking change>"
  fi
  echo "Note: Breaking changes trigger a MAJOR version bump." >&2
fi

header=""
while :; do
  echo
  read -r -p "Subject (required, lower-case, no trailing period): " subject
  subject=${subject## } # trim left (best-effort)
  subject=${subject%% } # trim right (best-effort)

  if [[ -z "${subject}" ]]; then
    echo "Subject cannot be empty." >&2
    continue
  fi
  if [[ "${subject}" == *"." ]]; then
    echo "Subject must not end with a period (.)" >&2
    continue
  fi

  if [[ -n "${scope}" ]]; then
    header="${type}(${scope})${bang}: ${subject}"
  else
    header="${type}${bang}: ${subject}"
  fi

  if [[ ${#header} -gt 100 ]]; then
    echo "Header is ${#header} chars; commitlint enforces max 100." >&2
    echo "Try shortening the subject (or remove scope)." >&2
    continue
  fi

  break
done

tmpfile=$(mktemp -t pluto-commit.XXXXXX)
cleanup() { rm -f "${tmpfile}"; }
trap cleanup EXIT

{
  printf '%s\n' "$header"
  printf '\n'

  if [[ -n "${breaking_footer}" ]]; then
    printf '\n'
    printf '%s\n' "$breaking_footer"
  fi
} >"${tmpfile}"

if (( DRY_RUN )); then
  cat "${tmpfile}"
  exit 0
fi

if (( NO_EDIT )); then
  git commit -F "${tmpfile}"
else
  git commit -e -F "${tmpfile}"
fi
