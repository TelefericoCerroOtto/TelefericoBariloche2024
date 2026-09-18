#!/usr/bin/env bash
set -uo pipefail

export TB122_HARNESS_CAPABILITY=real-auth
export PLAYWRIGHT_REAL_AUTH_HARNESS_OPT_IN=run
if [[ "$#" -ne 0 ]]; then
  printf 'The real-auth harness accepts no arguments.\n' >&2
  exit 2
fi

exec bash scripts/run-playwright-real-stack-readiness.sh
