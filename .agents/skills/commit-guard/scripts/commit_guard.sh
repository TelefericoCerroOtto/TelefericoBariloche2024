#!/usr/bin/env bash
set -uo pipefail

TYPECHECK_ENABLED=0
ROOT_DIR="."
ROOT_DIR_SET=0

for arg in "$@"; do
  case "$arg" in
    --typecheck)
      if [[ "$TYPECHECK_ENABLED" -eq 1 ]]; then
        printf '%s\n' "ERROR: '--typecheck' may be specified only once." >&2
        exit 2
      fi
      TYPECHECK_ENABLED=1
      ;;
    -* )
      printf '%s\n' "ERROR: Unknown option '$arg'. Usage: commit_guard.sh [--typecheck] [ROOT_DIR]" >&2
      exit 2
      ;;
    *)
      if [[ "$ROOT_DIR_SET" -eq 1 ]]; then
        printf '%s\n' "ERROR: Only one ROOT_DIR may be specified. Usage: commit_guard.sh [--typecheck] [ROOT_DIR]" >&2
        exit 2
      fi
      ROOT_DIR="$arg"
      ROOT_DIR_SET=1
      ;;
  esac
done

ROOT_DIR="$(cd "$ROOT_DIR" && pwd)"

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: '$ROOT_DIR' is not a git repository."
  exit 1
fi

# -----------------------------
# Collect git change inventory
# -----------------------------
mapfile -t STAGED_FILES < <(git -C "$ROOT_DIR" diff --name-only --cached --diff-filter=ACMRTUXB)
mapfile -t UNSTAGED_FILES < <(git -C "$ROOT_DIR" diff --name-only --diff-filter=ACMRTUXB)
mapfile -t UNTRACKED_FILES < <(git -C "$ROOT_DIR" ls-files --others --exclude-standard)

declare -A CHANGED_SET=()
declare -A STAGED_SET=()
declare -A UNSTAGED_SET=()

for file in "${STAGED_FILES[@]}"; do
  STAGED_SET["$file"]=1
  CHANGED_SET["$file"]=1
done

for file in "${UNSTAGED_FILES[@]}"; do
  UNSTAGED_SET["$file"]=1
  CHANGED_SET["$file"]=1
done

for file in "${UNTRACKED_FILES[@]}"; do
  CHANGED_SET["$file"]=1
done

COMMON_FILES=()
for file in "${STAGED_FILES[@]}"; do
  if [[ -n "${UNSTAGED_SET[$file]:-}" ]]; then
    COMMON_FILES+=("$file")
  fi
done

# -----------------------------
# Affected packages detection
# -----------------------------
APP_AFFECTED=0
CMS_AFFECTED=0
PIPELINE_AFFECTED=0
OTHER_AFFECTED=0

for file in "${!CHANGED_SET[@]}"; do
  case "$file" in
    teleferico-app/*) APP_AFFECTED=1 ;;
    teleferico-cms/*) CMS_AFFECTED=1 ;;
    tools/image-pipeline/*) PIPELINE_AFFECTED=1 ;;
    *) OTHER_AFFECTED=1 ;;
  esac
done

# -----------------------------
# Helpers
# -----------------------------
has_conflict_markers() {
  # Scan only changed tracked files (staged + unstaged) for merge conflict markers.
  # This is read-only.
  local any=0
  local f
  for f in "${STAGED_FILES[@]}" "${UNSTAGED_FILES[@]}"; do
    [[ -z "$f" ]] && continue
    [[ ! -f "$ROOT_DIR/$f" ]] && continue
    if rg -n --fixed-strings -S -m 1 '<<<<<<<' "$ROOT_DIR/$f" >/dev/null 2>&1; then any=1; break; fi
    if rg -n --fixed-strings -S -m 1 '>>>>>>>' "$ROOT_DIR/$f" >/dev/null 2>&1; then any=1; break; fi
    if rg -n --fixed-strings -S -m 1 '=======' "$ROOT_DIR/$f" >/dev/null 2>&1; then any=1; break; fi
  done
  echo "$any"
}

choose_pm_for_dir() {
  # Detect PM for a given package directory WITHOUT relying on root lockfiles.
  # Preference:
  # 1) lockfile in that dir
  # 2) package.json "packageManager"
  # 3) fallback to npm if available
  local rel_dir="$1"
  local dir="$ROOT_DIR/$rel_dir"
  local pj="$dir/package.json"

  if [[ -f "$dir/pnpm-lock.yaml" ]] && command -v pnpm >/dev/null 2>&1; then
    echo "pnpm"
    return 0
  fi

  if [[ -f "$dir/yarn.lock" ]] && command -v yarn >/dev/null 2>&1; then
    echo "yarn"
    return 0
  fi

  if [[ -f "$dir/package-lock.json" ]] && command -v npm >/dev/null 2>&1; then
    echo "npm"
    return 0
  fi

  if [[ -f "$pj" ]]; then
    if rg -n --fixed-strings '"packageManager"' "$pj" >/dev/null 2>&1; then
      if rg -n --fixed-strings '"packageManager": "pnpm@' "$pj" >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
        echo "pnpm"
        return 0
      fi
      if rg -n --fixed-strings '"packageManager": "yarn@' "$pj" >/dev/null 2>&1 && command -v yarn >/dev/null 2>&1; then
        echo "yarn"
        return 0
      fi
      if rg -n --fixed-strings '"packageManager": "npm@' "$pj" >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        echo "npm"
        return 0
      fi
    fi
  fi

  if command -v npm >/dev/null 2>&1; then
    echo "npm"
    return 0
  fi

  echo ""
  return 1
}

run_typecheck_for_package() {
  local rel_dir="$1"
  local label="$2"
  local affected="$3"

  if [[ "$affected" -eq 0 ]]; then
    echo "$label|SKIPPED|Package not affected by current changes."
    return 0
  fi

  local package_json="$ROOT_DIR/$rel_dir/package.json"
  if [[ ! -f "$package_json" ]]; then
    echo "$label|SKIPPED|package.json not found."
    return 0
  fi

  # Parse JSON structurally so formatting/newlines cannot hide a declared script.
  local script_state
  if ! script_state="$(node -e '
    const fs = require("node:fs");
    try {
      const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) throw new Error("root must be an object");
      if (pkg.scripts === undefined) process.stdout.write("MISSING");
      else if (!pkg.scripts || typeof pkg.scripts !== "object" || Array.isArray(pkg.scripts)) throw new Error("scripts must be an object");
      else if (Object.hasOwn(pkg.scripts, "typecheck")) {
        if (typeof pkg.scripts.typecheck !== "string" || !pkg.scripts.typecheck.trim()) throw new Error("scripts.typecheck must be a non-empty string");
        process.stdout.write("PRESENT");
      } else process.stdout.write("MISSING");
    } catch (error) {
      process.stderr.write(`Invalid package configuration: ${error.message}`);
      process.exitCode = 2;
    }
  ' "$package_json" 2>&1)"; then
    echo "$label|FAILED|Malformed package.json: $script_state"
    return 0
  fi
  if [[ "$script_state" == "MISSING" ]]; then
    echo "$label|NOT_AVAILABLE|No typecheck script in package.json."
    return 0
  fi

  local pm
  pm="$(choose_pm_for_dir "$rel_dir")"
  if [[ -z "$pm" ]]; then
    echo "$label|FAILED|No supported package manager found (pnpm/yarn/npm)."
    return 0
  fi

  local log_file
  log_file="$(mktemp)"

  # Note: typecheck may generate cache/buildinfo depending on project config.
  # We do NOT delete anything; only report pass/fail + diagnostics.
  if (
    cd "$ROOT_DIR/$rel_dir" &&
      CI=1 "$pm" run typecheck
  ) >"$log_file" 2>&1; then
    rm -f "$log_file"
    echo "$label|PASSED|Typecheck passed."
    return 0
  fi

  local details
  details="$(tail -n 40 "$log_file" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
  rm -f "$log_file"
  echo "$label|FAILED|Typecheck failed. Last lines: $details"
  return 0
}

# -----------------------------
# Report
# -----------------------------
echo "=== Commit Guard Report ==="
echo "Repository: $ROOT_DIR"
echo "Branch: $(git -C "$ROOT_DIR" branch --show-current)"
echo

echo "Change inventory:"
echo "- Staged files: ${#STAGED_FILES[@]}"
echo "- Unstaged files: ${#UNSTAGED_FILES[@]}"
echo "- Untracked files: ${#UNTRACKED_FILES[@]}"

if [[ "${#STAGED_FILES[@]}" -gt 0 ]]; then
  echo
  echo "Staged files:"
  for file in "${STAGED_FILES[@]}"; do
    echo "- $file"
  done
fi

if [[ "${#UNSTAGED_FILES[@]}" -gt 0 ]]; then
  echo
  echo "Unstaged files:"
  for file in "${UNSTAGED_FILES[@]}"; do
    echo "- $file"
  done
fi

if [[ "${#UNTRACKED_FILES[@]}" -gt 0 ]]; then
  echo
  echo "Untracked files:"
  for file in "${UNTRACKED_FILES[@]}"; do
    echo "- $file"
  done
fi

echo
echo "Patch sanity checks:"
CACHED_DIFF_CHECK_OUTPUT="$(git -C "$ROOT_DIR" diff --cached --check || true)"
UNSTAGED_DIFF_CHECK_OUTPUT="$(git -C "$ROOT_DIR" diff --check || true)"
if [[ -n "$CACHED_DIFF_CHECK_OUTPUT" ]]; then
  echo "- git diff --cached --check: ISSUES"
  echo "  (showing up to 10 lines)"
  echo "$CACHED_DIFF_CHECK_OUTPUT" | head -n 10 | sed 's/^/  /'
else
  echo "- git diff --cached --check: OK"
fi
if [[ -n "$UNSTAGED_DIFF_CHECK_OUTPUT" ]]; then
  echo "- git diff --check: ISSUES"
  echo "  (showing up to 10 lines)"
  echo "$UNSTAGED_DIFF_CHECK_OUTPUT" | head -n 10 | sed 's/^/  /'
else
  echo "- git diff --check: OK"
fi

CONFLICT_FOUND="$(has_conflict_markers)"
if [[ "$CONFLICT_FOUND" -eq 1 ]]; then
  echo "- Conflict markers: FOUND (<<<<<<< / ======= / >>>>>>>)"
else
  echo "- Conflict markers: none detected"
fi

echo
echo "Potential related hunks/files to stage:"
if [[ "${#COMMON_FILES[@]}" -eq 0 ]]; then
  echo "- None detected."
else
  for file in "${COMMON_FILES[@]}"; do
    echo "- $file (has both staged and unstaged changes)"
    echo "  Suggested: git add -p \"$file\""
  done
fi

echo
echo "Affected packages:"
[[ "$APP_AFFECTED" -eq 1 ]] && echo "- teleferico-app"
[[ "$CMS_AFFECTED" -eq 1 ]] && echo "- teleferico-cms"
[[ "$PIPELINE_AFFECTED" -eq 1 ]] && echo "- tools/image-pipeline"
[[ "$OTHER_AFFECTED" -eq 1 ]] && echo "- Other paths outside known packages"
if [[ "$APP_AFFECTED" -eq 0 && "$CMS_AFFECTED" -eq 0 && "$PIPELINE_AFFECTED" -eq 0 && "$OTHER_AFFECTED" -eq 0 ]]; then
  echo "- None"
fi

echo
echo "Typecheck results:"
if [[ "$TYPECHECK_ENABLED" -eq 1 ]]; then
  mapfile -t TYPECHECK_RESULTS < <(
    run_typecheck_for_package "teleferico-app" "teleferico-app" "$APP_AFFECTED"
    run_typecheck_for_package "teleferico-cms" "teleferico-cms" "$CMS_AFFECTED"
    run_typecheck_for_package "tools/image-pipeline" "tools/image-pipeline" "$PIPELINE_AFFECTED"
  )
else
  TYPECHECK_RESULTS=()
  [[ "$APP_AFFECTED" -eq 1 ]] && TYPECHECK_RESULTS+=("teleferico-app|NOT_RUN|Typecheck is opt-in; rerun with --typecheck for a deep diagnostic.")
  [[ "$CMS_AFFECTED" -eq 1 ]] && TYPECHECK_RESULTS+=("teleferico-cms|NOT_RUN|Typecheck is opt-in; rerun with --typecheck for a deep diagnostic.")
  [[ "$PIPELINE_AFFECTED" -eq 1 ]] && TYPECHECK_RESULTS+=("tools/image-pipeline|NOT_RUN|Typecheck is opt-in; rerun with --typecheck for a deep diagnostic.")
  [[ "${#TYPECHECK_RESULTS[@]}" -gt 0 ]] || TYPECHECK_RESULTS+=("all packages|NOT_RUN|No package typecheck was requested.")
fi

TYPECHECK_FAILED=0
CONFIG_FAILED=0
for result in "${TYPECHECK_RESULTS[@]}"; do
  IFS='|' read -r pkg status message <<<"$result"
  echo "- $pkg: $status - $message"
  if [[ "$status" == "FAILED" ]]; then
    if [[ "$message" == Malformed\ package.json:* ]]; then
      CONFIG_FAILED=1
    else
      TYPECHECK_FAILED=1
    fi
  fi
done

STATUS="READY"
REASONS=()

if [[ "${#STAGED_FILES[@]}" -eq 0 ]]; then
  STATUS="NOT READY"
  REASONS+=("No staged changes found.")
fi

if [[ "$TYPECHECK_FAILED" -eq 1 ]]; then
  STATUS="NOT READY"
  REASONS+=("At least one affected package failed typecheck.")
fi

if [[ "$CONFIG_FAILED" -eq 1 ]]; then
  STATUS="NOT READY"
  REASONS+=("At least one affected package has malformed package configuration.")
fi

if [[ -n "$CACHED_DIFF_CHECK_OUTPUT" || -n "$UNSTAGED_DIFF_CHECK_OUTPUT" ]]; then
  STATUS="NOT READY"
  REASONS+=("git diff --cached --check or git diff --check reported whitespace/errors.")
fi

if [[ "$CONFLICT_FOUND" -eq 1 ]]; then
  STATUS="NOT READY"
  REASONS+=("Merge conflict markers detected in changed files.")
fi

if [[ "$STATUS" != "NOT READY" ]]; then
  if [[ "${#COMMON_FILES[@]}" -gt 0 || "${#UNSTAGED_FILES[@]}" -gt 0 || "${#UNTRACKED_FILES[@]}" -gt 0 ]]; then
    STATUS="NEEDS REVIEW"
    [[ "${#COMMON_FILES[@]}" -gt 0 ]] && REASONS+=("Partial-file staging detected (same file in staged and unstaged).")
    [[ "${#UNSTAGED_FILES[@]}" -gt 0 ]] && REASONS+=("Unstaged tracked changes exist.")
    [[ "${#UNTRACKED_FILES[@]}" -gt 0 ]] && REASONS+=("Untracked files exist.")
  fi
fi

# Optional: detect if typecheck introduced new working tree changes (without touching anything)
POST_STATUS="$(git -C "$ROOT_DIR" status --porcelain=v1 || true)"
# If there are staged changes, porcelain will include them too; we only warn if there is *any* output and we were otherwise READY.
if [[ "$STATUS" != "NOT READY" && -n "$POST_STATUS" ]]; then
  # This is informational only.
  :
fi

echo
echo "Commit readiness:"
echo "- Status: $STATUS"
if [[ "$TYPECHECK_ENABLED" -eq 0 ]]; then
  echo "- Typecheck: NOT_RUN (quick staging diagnostics do not verify TypeScript)."
fi

if [[ "${#REASONS[@]}" -eq 0 ]]; then
  echo "- Reasons: none"
else
  echo "- Reasons:"
  for reason in "${REASONS[@]}"; do
    echo "  - $reason"
  done
fi

echo
echo "Suggested next actions:"
if [[ "$STATUS" == "READY" ]]; then
  echo "- Ready to commit."
elif [[ "$STATUS" == "NEEDS REVIEW" ]]; then
  if [[ "${#COMMON_FILES[@]}" -gt 0 ]]; then
    echo "- Review partial-file staging with git add -p for listed files."
  fi
  if [[ "${#UNSTAGED_FILES[@]}" -gt 0 ]]; then
    echo "- Stage relevant unstaged files if they belong in this commit."
  fi
  if [[ "${#UNTRACKED_FILES[@]}" -gt 0 ]]; then
    echo "- Decide whether to add or ignore untracked files."
  fi
else
  if [[ "${#STAGED_FILES[@]}" -eq 0 ]]; then
    echo "- Stage the intended changes first."
  fi
  if [[ "$TYPECHECK_FAILED" -eq 1 ]]; then
    echo "- Fix typecheck failures in affected packages before committing."
  fi
  if [[ -n "$CACHED_DIFF_CHECK_OUTPUT" || -n "$UNSTAGED_DIFF_CHECK_OUTPUT" ]]; then
    echo "- Fix whitespace/errors reported by git diff --cached --check and git diff --check."
  fi
  if [[ "$CONFLICT_FOUND" -eq 1 ]]; then
    echo "- Resolve merge conflict markers in the changed files."
  fi
fi
