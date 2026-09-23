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

if ! rg -F -- '- teleferico-app: PASSED - Typecheck passed.' "$TEMP_ROOT/multiline-report" >/dev/null; then
  printf '%s\n' 'Expected multiline app typecheck script to be detected and invoked.' >&2
  exit 1
fi
if ! rg -F -- '- teleferico-cms: NOT_AVAILABLE - No typecheck script in package.json.' "$TEMP_ROOT/multiline-report" >/dev/null; then
  printf '%s\n' 'Expected CMS without a typecheck script to remain NOT_AVAILABLE.' >&2
  exit 1
fi
if [[ "$(<"$TYPECHECK_CALL_LOG")" != 'run typecheck' ]]; then
  printf '%s\n' 'Expected exactly one stubbed typecheck command; no real typecheck is run.' >&2
  exit 1
fi

MALFORMED_FIXTURE="$TEMP_ROOT/malformed"
new_fixture "$MALFORMED_FIXTURE"
printf '{ "scripts": ' > "$MALFORMED_FIXTURE/teleferico-app/package.json"
printf '{ "scripts": {} }\n' > "$MALFORMED_FIXTURE/teleferico-cms/package.json"
touch "$MALFORMED_FIXTURE/teleferico-app/pnpm-lock.yaml"
if ! PATH="$MALFORMED_FIXTURE/bin:$PATH" bash "$GUARD" "$MALFORMED_FIXTURE" > "$TEMP_ROOT/malformed-report"; then
  printf '%s\n' 'The guard should report malformed package configuration without aborting.' >&2
  exit 1
fi
if ! rg -F -- 'teleferico-app: FAILED - Malformed package.json:' "$TEMP_ROOT/malformed-report" >/dev/null \
  || ! rg -F -- '- Status: NOT READY' "$TEMP_ROOT/malformed-report" >/dev/null; then
  printf '%s\n' 'Expected malformed package.json to fail explicitly and mark the guard NOT READY.' >&2
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

printf '%s\n' 'commit_guard fixture contracts passed (typecheck was stubbed; no actual typecheck ran).'
