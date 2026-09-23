#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
GUARD="$REPO_ROOT/.agents/skills/commit-guard/scripts/commit_guard.sh"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT

new_fixture() {
  local root="$1"
  mkdir -p "$root/teleferico-app/src" "$root/teleferico-cms/src" "$root/bin"
  git -C "$root" init -q
  printf 'fixture\n' > "$root/teleferico-app/src/change.ts"
  printf 'fixture\n' > "$root/teleferico-cms/src/change.js"
  git -C "$root" add teleferico-app/src/change.ts teleferico-cms/src/change.js
  cat > "$root/bin/pnpm" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$TYPECHECK_CALL_LOG"
exit 0
STUB
  chmod +x "$root/bin/pnpm"
}

APP_FIXTURE="$TEMP_ROOT/multiline"
new_fixture "$APP_FIXTURE"
printf '{\n  "scripts": {\n    "typecheck": "tsc --noEmit"\n  }\n}\n' > "$APP_FIXTURE/teleferico-app/package.json"
printf '{\n  "scripts": {\n    "test": "jest"\n  }\n}\n' > "$APP_FIXTURE/teleferico-cms/package.json"
touch "$APP_FIXTURE/teleferico-app/pnpm-lock.yaml"
export TYPECHECK_CALL_LOG="$TEMP_ROOT/typecheck-calls"
PATH="$APP_FIXTURE/bin:$PATH" bash "$GUARD" "$APP_FIXTURE" > "$TEMP_ROOT/multiline-report"

if [[ -e "$TYPECHECK_CALL_LOG" ]]; then
  printf '%s\n' 'Default quick mode must not launch a package manager.' >&2
  exit 1
fi
if ! rg -F -- '- teleferico-app: NOT_RUN - Typecheck is opt-in;' "$TEMP_ROOT/multiline-report" >/dev/null \
  || ! rg -F -- '- Typecheck: NOT_RUN (quick staging diagnostics do not verify TypeScript).' "$TEMP_ROOT/multiline-report" >/dev/null; then
  printf '%s\n' 'Expected default quick mode to report Typecheck NOT_RUN explicitly.' >&2
  exit 1
fi
PATH="$APP_FIXTURE/bin:$PATH" bash "$GUARD" --typecheck "$APP_FIXTURE" > "$TEMP_ROOT/deep-report"
if ! rg -F -- '- teleferico-app: PASSED - Typecheck passed.' "$TEMP_ROOT/deep-report" >/dev/null \
  || ! rg -F -- '- teleferico-cms: NOT_AVAILABLE - No typecheck script in package.json.' "$TEMP_ROOT/deep-report" >/dev/null; then
  printf '%s\n' 'Expected explicit deep mode to detect/invoke app typecheck and report missing CMS script.' >&2
  exit 1
fi
if [[ "$(<"$TYPECHECK_CALL_LOG")" != 'run typecheck' ]]; then
  printf '%s\n' 'Expected one stubbed typecheck invocation in explicit deep mode only.' >&2
  exit 1
fi

MALFORMED_FIXTURE="$TEMP_ROOT/malformed"
new_fixture "$MALFORMED_FIXTURE"
rm -f "$TYPECHECK_CALL_LOG"
printf '{ "scripts": ' > "$MALFORMED_FIXTURE/teleferico-app/package.json"
printf '{ "scripts": {} }\n' > "$MALFORMED_FIXTURE/teleferico-cms/package.json"
touch "$MALFORMED_FIXTURE/teleferico-app/pnpm-lock.yaml"
if ! PATH="$MALFORMED_FIXTURE/bin:$PATH" bash "$GUARD" "$MALFORMED_FIXTURE" > "$TEMP_ROOT/malformed-quick-report"; then
  printf '%s\n' 'Default quick mode should not parse package configuration.' >&2
  exit 1
fi
if ! rg -F -- '- teleferico-app: NOT_RUN' "$TEMP_ROOT/malformed-quick-report" >/dev/null \
  || [[ -e "$TYPECHECK_CALL_LOG" ]]; then
  printf '%s\n' 'Expected malformed configuration to be ignored without running typecheck in quick mode.' >&2
  exit 1
fi
if ! PATH="$MALFORMED_FIXTURE/bin:$PATH" bash "$GUARD" --typecheck "$MALFORMED_FIXTURE" > "$TEMP_ROOT/malformed-report"; then
  printf '%s\n' 'Deep mode should report malformed package configuration without aborting.' >&2
  exit 1
fi
if ! rg -F -- 'teleferico-app: FAILED - Malformed package.json:' "$TEMP_ROOT/malformed-report" >/dev/null \
  || ! rg -F -- '- Status: NOT READY' "$TEMP_ROOT/malformed-report" >/dev/null; then
  printf '%s\n' 'Expected malformed package.json to fail explicitly only in deep mode.' >&2
  exit 1
fi
if rg -F -- 'run typecheck' "$TEMP_ROOT/malformed-report" >/dev/null; then
  printf '%s\n' 'Malformed package configuration must not launch typecheck.' >&2
  exit 1
fi

STAGED_WHITESPACE_FIXTURE="$TEMP_ROOT/staged-whitespace"
new_fixture "$STAGED_WHITESPACE_FIXTURE"
printf 'staged whitespace violation \n' > "$STAGED_WHITESPACE_FIXTURE/teleferico-app/src/change.ts"
git -C "$STAGED_WHITESPACE_FIXTURE" add teleferico-app/src/change.ts
printf '{ "scripts": {} }\n' > "$STAGED_WHITESPACE_FIXTURE/teleferico-app/package.json"
printf '{ "scripts": {} }\n' > "$STAGED_WHITESPACE_FIXTURE/teleferico-cms/package.json"
if [[ -n "$(git -C "$STAGED_WHITESPACE_FIXTURE" diff --check)" ]]; then
  printf '%s\n' 'Fixture error: unstaged diff should be clean for the staged-whitespace contract.' >&2
  exit 1
fi
if ! PATH="$STAGED_WHITESPACE_FIXTURE/bin:$PATH" bash "$GUARD" "$STAGED_WHITESPACE_FIXTURE" > "$TEMP_ROOT/staged-whitespace-report"; then
  printf '%s\n' 'The guard should report staged whitespace errors without aborting.' >&2
  exit 1
fi
if ! rg -F -- '- git diff --cached --check: ISSUES' "$TEMP_ROOT/staged-whitespace-report" >/dev/null \
  || ! rg -F -- '- git diff --check: OK' "$TEMP_ROOT/staged-whitespace-report" >/dev/null \
  || ! rg -F -- '- Status: NOT READY' "$TEMP_ROOT/staged-whitespace-report" >/dev/null; then
  printf '%s\n' 'Expected staged whitespace errors to produce NOT READY while unstaged checks remain independently clean.' >&2
  exit 1
fi

DOCS_FIXTURE="$TEMP_ROOT/docs-only"
rm -f "$TYPECHECK_CALL_LOG"
mkdir -p "$DOCS_FIXTURE/docs" "$DOCS_FIXTURE/bin"
git -C "$DOCS_FIXTURE" init -q
printf 'documentation\n' > "$DOCS_FIXTURE/docs/change.md"
git -C "$DOCS_FIXTURE" add docs/change.md
PATH="$APP_FIXTURE/bin:$PATH" bash "$GUARD" "$DOCS_FIXTURE" > "$TEMP_ROOT/docs-report"
if ! rg -F -- '- all packages: NOT_RUN - No package typecheck was requested.' "$TEMP_ROOT/docs-report" >/dev/null \
  || [[ -e "$TYPECHECK_CALL_LOG" ]]; then
  printf '%s\n' 'Docs-only quick mode must not invoke a package manager and must report typecheck NOT_RUN.' >&2
  exit 1
fi

if PATH="$APP_FIXTURE/bin:$PATH" bash "$GUARD" --unknown "$APP_FIXTURE" > "$TEMP_ROOT/unknown-report" 2>&1; then
  printf '%s\n' 'Unknown options must fail before repository work.' >&2
  exit 1
fi
if ! rg -F -- "ERROR: Unknown option '--unknown'." "$TEMP_ROOT/unknown-report" >/dev/null \
  || rg -F -- 'Repository:' "$TEMP_ROOT/unknown-report" >/dev/null; then
  printf '%s\n' 'Expected a clear error for unknown options.' >&2
  exit 1
fi

if PATH="$APP_FIXTURE/bin:$PATH" bash "$GUARD" --typecheck --typecheck "$APP_FIXTURE" > "$TEMP_ROOT/duplicate-report" 2>&1; then
  printf '%s\n' 'Duplicate deep-mode flags must fail before repository work.' >&2
  exit 1
fi
if ! rg -F -- "ERROR: '--typecheck' may be specified only once." "$TEMP_ROOT/duplicate-report" >/dev/null \
  || rg -F -- 'Repository:' "$TEMP_ROOT/duplicate-report" >/dev/null; then
  printf '%s\n' 'Expected a clear error for duplicate deep-mode flags.' >&2
  exit 1
fi

printf '%s\n' 'commit_guard fixture contracts passed (typecheck was stubbed; no actual typecheck ran).'
