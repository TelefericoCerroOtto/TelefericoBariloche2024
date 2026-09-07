#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
target_hooks_path="$repo_root/.githooks"
common_git_dir=$(git -C "$repo_root" rev-parse --git-common-dir)
case "$common_git_dir" in
  /*)
    ;;
  *)
    common_git_dir="$repo_root/$common_git_dir"
    ;;
esac
common_config_path="$common_git_dir/config"
worktree_config_path=$(git -C "$repo_root" rev-parse --git-path config.worktree)
case "$worktree_config_path" in
  /*)
    ;;
  *)
    worktree_config_path="$repo_root/$worktree_config_path"
    ;;
esac

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

worktree_hooks_paths() {
  git config --file "$worktree_config_path" --get-all core.hooksPath 2>/dev/null || true
}

ensure_matching_paths() {
  source_name=$1
  paths=$2
  [ -z "$paths" ] && return
  old_ifs=$IFS
  IFS='
'
  for candidate in $paths; do
    [ "$candidate" = "$target_hooks_path" ] || fail "Refusing to override $source_name core.hooksPath '$candidate'."
  done
  IFS=$old_ifs
}

contains_target_path() {
  paths=$1
  [ -z "$paths" ] && return 1
  old_ifs=$IFS
  IFS='
'
  for candidate in $paths; do
    if [ "$candidate" = "$target_hooks_path" ]; then
      IFS=$old_ifs
      return 0
    fi
  done
  IFS=$old_ifs
  return 1
}

ensure_no_conflicting_lower_paths() {
  ensure_matching_paths 'common repository' "$(git config --file "$common_config_path" --get-all core.hooksPath 2>/dev/null || true)"
  ensure_matching_paths 'global' "$(git config --global --get-all core.hooksPath 2>/dev/null || true)"
}

remove_hooks() {
  worktree_paths=$(worktree_hooks_paths)
  if ! contains_target_path "$worktree_paths"; then
    printf '%s\n' 'No script-owned worktree core.hooksPath is configured.'
    return
  fi
  git config --file "$worktree_config_path" --unset-all --fixed-value core.hooksPath "$target_hooks_path"
  printf 'Removed worktree core.hooksPath=%s\n' "$target_hooks_path"
  external_hooks_path=$(git -C "$repo_root" config --get core.hooksPath 2>/dev/null || true)
  [ -z "$external_hooks_path" ] || printf 'Preserved external core.hooksPath is now effective: %s\n' "$external_hooks_path"
}

case "${1:-}" in
  --remove)
    remove_hooks
    exit 0
    ;;
  "")
    ;;
  *)
    fail 'Use: ./scripts/setup-git-hooks.sh [--remove]'
    ;;
esac

extension=$(git config --file "$common_config_path" --get --bool extensions.worktreeConfig 2>/dev/null || true)
preexisting_worktree_hooks_paths=$(worktree_hooks_paths)
if [ "$extension" != "true" ] && [ -n "$preexisting_worktree_hooks_paths" ]; then
  ensure_matching_paths 'worktree' "$preexisting_worktree_hooks_paths"
fi
case "$extension" in
  true)
    ;;
  false)
    fail 'Refusing to replace extensions.worktreeConfig=false. Enable worktree-specific config explicitly before installing repository hooks.'
    ;;
  "")
    existing_hooks_path=$(git -C "$repo_root" config --get core.hooksPath 2>/dev/null || true)
    [ -z "$existing_hooks_path" ] || [ "$existing_hooks_path" = "$target_hooks_path" ] || fail "Refusing to replace existing effective core.hooksPath '$existing_hooks_path'. Preserve or remove it explicitly before installing repository hooks."
    git config --file "$common_config_path" extensions.worktreeConfig true
    ;;
  *)
    fail "Invalid extensions.worktreeConfig value '$extension'."
    ;;
esac

ensure_no_conflicting_lower_paths
current_hooks_paths=$(worktree_hooks_paths)
if [ -n "$current_hooks_paths" ]; then
  ensure_matching_paths 'worktree' "$current_hooks_paths"
  [ "$(printf '%s\n' "$current_hooks_paths" | wc -l | tr -d ' ')" = "1" ] || fail 'Refusing to reuse multiple worktree core.hooksPath values.'
  printf 'Worktree core.hooksPath already configured: %s\n' "$target_hooks_path"
  exit 0
fi

existing_hooks_path=$(git -C "$repo_root" config --get core.hooksPath 2>/dev/null || true)
[ -z "$existing_hooks_path" ] || [ "$existing_hooks_path" = "$target_hooks_path" ] || fail "Refusing to override existing effective core.hooksPath '$existing_hooks_path'. Preserve or remove it explicitly before installing repository hooks."

git -C "$repo_root" config --worktree core.hooksPath "$target_hooks_path"
printf 'Configured worktree core.hooksPath=%s\n' "$target_hooks_path"
