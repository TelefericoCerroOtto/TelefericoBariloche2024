#!/usr/bin/env bash
set -uo pipefail

readonly POSTGRES_IMAGE="postgres:16-bookworm@sha256:bb3e1a57e5407e0a5280b4211980a5e537f4abd234a87014ac979849a78dd825"
readonly RUNNER_IMAGE="node@sha256:4d676821dff059fd00d277ee4261ef34ea712317fed0737c03941481b5760c96"
readonly POSTGRES_USER="readiness"
readonly POSTGRES_DATABASE="readiness"
readonly DIAGNOSTIC_LINES=80
readonly DIAGNOSTIC_BYTES=32768
readonly OPERATION_TIMEOUT_SECONDS=8
readonly CREATE_TIMEOUT_SECONDS=180
readonly CLEANUP_RESERVE_DEADLINE_SECONDS=720
readonly POSTGRES_READINESS_DEADLINE_SECONDS=55
readonly POSTGRES_READINESS_INTERVAL_SECONDS=2

readonly raw_build_id="${BUILD_ID:?BUILD_ID is required}"
if ! [[ "$raw_build_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]; then
  printf 'BUILD_ID must use only 1-128 alphanumeric, dot, underscore, or hyphen characters and start with an alphanumeric character.\n' >&2
  exit 1
fi
normalized_build_id="$(tr -cd '[:alnum:]' <<<"$raw_build_id" | tr '[:upper:]' '[:lower:]')"
if [[ -z "$normalized_build_id" ]]; then
  printf 'BUILD_ID normalization produced an empty identity.\n' >&2
  exit 1
fi
build_id_hash="$(printf '%s' "$raw_build_id" | sha256sum)"
build_id_hash_status=$?
if [[ "$build_id_hash_status" -ne 0 ]]; then
  printf 'BUILD_ID digest calculation failed.\n' >&2
  exit "$build_id_hash_status"
fi
build_id_hash="${build_id_hash%% *}"
if ! [[ "$build_id_hash" =~ ^[a-f0-9]{64}$ ]]; then
  printf 'BUILD_ID digest calculation returned an invalid result.\n' >&2
  exit 1
fi
readonly build_id_digest="${build_id_hash:0:24}"
readonly build_namespace="${build_id_digest}"
readonly POSTGRES_CONTAINER="tb122-readiness-postgres-${build_namespace}"
readonly RUNNER_CONTAINER="tb122-readiness-runner-${build_namespace}"
readonly OWNERSHIP_LABEL="tb122.playwright.build=${build_namespace}"
readonly POSTGRES_PASSWORD="in-build-${build_id_digest}"
readonly DIAGNOSTIC_DIRECTORY="$(mktemp -d /tmp/tb122-readiness.XXXXXX)"

postgres_id=""
runner_id=""
postgres_state="not-created"
runner_state="not-created"
primary_kind=""
primary_phase=""
primary_code=0
primary_detail=""
received_signal=""
cleanup_failed=0
cleanup_evidence=()
finalizing=0

record_primary() {
  if [[ "$primary_code" -eq 0 ]]; then
    primary_kind="$1"
    primary_phase="$2"
    primary_code="$3"
    primary_detail="$4"
  fi
}

record_cleanup() {
  local resource="$1" operation="$2" status="$3" detail="$4"
  cleanup_evidence+=("resource=${resource} operation=${operation} status=${status} detail=${detail}")
  if [[ "$status" == "failed" ]]; then
    cleanup_failed=1
  fi
}

run_bounded() {
  timeout --signal=TERM --kill-after=5s "${OPERATION_TIMEOUT_SECONDS}s" "$@"
}

run_bounded_until() {
  local remaining_seconds="$1"
  shift
  timeout --signal=KILL "${remaining_seconds}s" "$@"
}

run_create_bounded() {
  timeout --signal=TERM --kill-after=10s "${CREATE_TIMEOUT_SECONDS}s" "$@"
}

container_owned() {
  local resource="$1" expected_id="$2" expected_name="$3" actual
  if [[ -z "$expected_id" ]]; then
    return 1
  fi
  if ! actual="$(run_bounded docker inspect --format '{{.Id}} {{index .Config.Labels "tb122.playwright.build"}} {{.Name}}' "$expected_id")"; then
    record_cleanup "$resource" "verify-ownership" "failed" "inspect-failed"
    return 1
  fi
  if [[ "$actual" != "$expected_id $build_namespace /$expected_name" ]]; then
    record_cleanup "$resource" "verify-ownership" "failed" "identity-mismatch"
    return 1
  fi
  record_cleanup "$resource" "verify-ownership" "succeeded" "owned"
  return 0
}

cleanup_container() {
  local resource="$1" container_id="$2" container_name="$3" state inspect_status inspect_output pipeline_statuses
  if [[ -z "$container_id" ]]; then
    record_cleanup "$resource" "cleanup" "succeeded" "not-created"
    return
  fi
  if ! container_owned "$resource" "$container_id" "$container_name"; then
    record_cleanup "$resource" "remove" "failed" "ownership-not-proven"
    return
  fi

  if state="$(run_bounded docker inspect --format '{{.State.Running}}' "$container_id")"; then
    if [[ "$state" == "true" ]]; then
      if run_bounded docker stop --time 5 "$container_id"; then
        record_cleanup "$resource" "stop" "succeeded" "stopped"
      else
        record_cleanup "$resource" "stop" "failed" "bounded-stop-failed"
      fi
    else
      record_cleanup "$resource" "stop" "succeeded" "already-stopped"
    fi
  else
    record_cleanup "$resource" "inspect-state" "failed" "bounded-inspect-failed"
  fi

  if run_bounded docker rm --force "$container_id"; then
    record_cleanup "$resource" "remove" "succeeded" "removed"
  else
    record_cleanup "$resource" "remove" "failed" "bounded-remove-failed"
  fi
  inspect_output="$DIAGNOSTIC_DIRECTORY/${resource}-post-remove.log"
  run_bounded docker inspect "$container_id" 2>&1 | tail -c "$DIAGNOSTIC_BYTES" >"$inspect_output"
  pipeline_statuses=("${PIPESTATUS[@]}")
  inspect_status="${pipeline_statuses[0]}"
  if [[ "${pipeline_statuses[1]}" -ne 0 ]]; then
    record_cleanup "$resource" "verify-removed" "failed" "evidence-bound-failed"
  elif [[ "$inspect_status" -eq 0 ]]; then
    record_cleanup "$resource" "verify-removed" "failed" "container-still-exists"
  elif [[ "$inspect_status" -eq 1 ]] && {
    grep -Fxq -- "Error: No such object: $container_id" "$inspect_output" ||
      grep -Fxq -- "Error response from daemon: No such container: $container_id" "$inspect_output"
  }; then
    record_cleanup "$resource" "verify-removed" "succeeded" "absent"
  else
    print_bounded_file "${resource}-verify-removed" "$inspect_output"
    record_cleanup "$resource" "verify-removed" "failed" "inspect-exit-${inspect_status}"
  fi
}

print_bounded_file() {
  local resource="$1" path="$2"
  if [[ ! -e "$path" ]]; then
    printf 'TB122 diagnostic resource=%s path=%s status=missing lines<=%s bytes<=%s\n' "$resource" "$path" "$DIAGNOSTIC_LINES" "$DIAGNOSTIC_BYTES" >&2
    return
  fi
  if [[ -L "$path" || ! -f "$path" ]]; then
    printf 'TB122 diagnostic resource=%s path=%s status=rejected-non-regular lines<=%s bytes<=%s\n' "$resource" "$path" "$DIAGNOSTIC_LINES" "$DIAGNOSTIC_BYTES" >&2
    return
  fi
  printf 'TB122 diagnostic resource=%s path=%s status=captured lines<=%s bytes<=%s\n' "$resource" "$path" "$DIAGNOSTIC_LINES" "$DIAGNOSTIC_BYTES" >&2
  if ! tail -n "$DIAGNOSTIC_LINES" "$path" | tail -c "$DIAGNOSTIC_BYTES" | sed -E \
    -e "s/${POSTGRES_PASSWORD}/[REDACTED]/g" \
    -e 's/([Aa]uthorization:[[:space:]]*[Bb]earer[[:space:]]+)[^[:space:]]+/\1[REDACTED]/g' \
    -e 's/((PASSWORD|SECRET|TOKEN|API_KEY|JWT)[A-Z0-9_-]*[=:])[^[:space:],]+/\1[REDACTED]/g' >&2; then
    record_cleanup "$resource" "bound-and-redact-diagnostic" "failed" "pipeline-failed"
  fi
}

capture_container_diagnostics() {
  local resource="$1" container_id="$2" output
  output="$DIAGNOSTIC_DIRECTORY/${resource}.log"
  if [[ -z "$container_id" ]]; then
    printf 'TB122 diagnostic resource=%s state=not-created\n' "$resource" >&2
    return
  fi
  if run_bounded docker inspect --format 'state={{.State.Status}} running={{.State.Running}} exit={{.State.ExitCode}}' "$container_id" >"$output" 2>&1; then
    printf 'TB122 diagnostic resource=%s operation=inspect status=succeeded\n' "$resource" >&2
  else
    printf 'TB122 diagnostic resource=%s operation=inspect status=failed\n' "$resource" >&2
    record_cleanup "$resource" "diagnostic-inspect" "failed" "bounded-inspect-failed"
  fi
  if ! run_bounded docker logs --tail "$DIAGNOSTIC_LINES" "$container_id" 2>&1 | tail -c "$DIAGNOSTIC_BYTES" >>"$output"; then
    printf 'TB122 diagnostic resource=%s operation=logs status=failed\n' "$resource" >&2
    record_cleanup "$resource" "diagnostic-logs" "failed" "bounded-log-read-failed"
  fi
  print_bounded_file "$resource" "$output"
}

on_signal() {
  local signal="$1" code="$2"
  if [[ -z "$received_signal" ]]; then
    received_signal="$signal"
    if [[ "$primary_code" -eq 0 ]]; then
      record_primary "signal" "signal" "$code" "$signal"
    fi
  fi
}

finalize() {
  local entry_status=$?
  if [[ "$finalizing" -eq 1 ]]; then
    return
  fi
  finalizing=1
  trap - EXIT
  if [[ "$primary_code" -eq 0 && "$entry_status" -ne 0 ]]; then
    record_primary "command" "harness" "$entry_status" "unclassified-command-failure"
  fi

  if [[ "$primary_code" -ne 0 ]]; then
    capture_container_diagnostics "runner" "$runner_id"
    capture_container_diagnostics "postgres" "$postgres_id"
    print_bounded_file "postgres-readiness" "$DIAGNOSTIC_DIRECTORY/postgres-readiness.log"
    print_bounded_file "postgres-final-readiness" "$DIAGNOSTIC_DIRECTORY/postgres-final-readiness.log"
  fi

  cleanup_container "runner" "$runner_id" "$RUNNER_CONTAINER"
  cleanup_container "postgres" "$postgres_id" "$POSTGRES_CONTAINER"

  if [[ "$primary_code" -eq 0 && "$cleanup_failed" -ne 0 ]]; then
    capture_container_diagnostics "runner" "$runner_id"
    capture_container_diagnostics "postgres" "$postgres_id"
    print_bounded_file "postgres-readiness" "$DIAGNOSTIC_DIRECTORY/postgres-readiness.log"
    print_bounded_file "postgres-final-readiness" "$DIAGNOSTIC_DIRECTORY/postgres-final-readiness.log"
  fi

  if run_bounded rm -rf -- "$DIAGNOSTIC_DIRECTORY"; then
    record_cleanup "diagnostic-directory" "remove" "succeeded" "removed"
  else
    record_cleanup "diagnostic-directory" "remove" "failed" "remove-failed"
  fi

  if [[ "$primary_code" -eq 0 ]]; then
    printf 'TB122 evidence primary=success phase=complete\n' >&2
  else
    printf 'TB122 evidence primary=failed kind=%s phase=%s code=%s detail=%s\n' "$primary_kind" "$primary_phase" "$primary_code" "$primary_detail" >&2
  fi
  printf 'TB122 resource=runner name=%s state=%s\n' "$RUNNER_CONTAINER" "$runner_state" >&2
  printf 'TB122 resource=postgres name=%s state=%s\n' "$POSTGRES_CONTAINER" "$postgres_state" >&2
  for evidence in "${cleanup_evidence[@]}"; do
    printf 'TB122 cleanup %s\n' "$evidence" >&2
  done

  local final_code=0 final_outcome="success"
  if [[ "$primary_code" -ne 0 ]]; then
    final_code="$primary_code"
    final_outcome="primary-failure"
    if [[ "$cleanup_failed" -ne 0 ]]; then
      final_outcome="primary-and-cleanup-failure"
    fi
  elif [[ "$cleanup_failed" -ne 0 ]]; then
    final_code=1
    final_outcome="cleanup-failure"
  fi
  printf 'TB122 evidence final=outcome:%s exit:%s signal:%s\n' "$final_outcome" "$final_code" "${received_signal:-none}" >&2
  exit "$final_code"
}

trap finalize EXIT
trap 'on_signal SIGINT 130' INT
trap 'on_signal SIGTERM 143' TERM

postgres_id="$(run_create_bounded docker create --name "$POSTGRES_CONTAINER" --network cloudbuild \
  --label "$OWNERSHIP_LABEL" \
  --env "POSTGRES_USER=$POSTGRES_USER" \
  --env "POSTGRES_DB=$POSTGRES_DATABASE" \
  --env "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
  "$POSTGRES_IMAGE")"
postgres_create_status=$?
if [[ "$postgres_create_status" -ne 0 ]]; then
  record_primary "command" "postgres-create" "$postgres_create_status" "docker-create-failed"
  exit "$postgres_create_status"
fi
if ! [[ "$postgres_id" =~ ^[a-f0-9]{64}$ ]]; then
  record_primary "command" "postgres-create" 1 "invalid-container-id"
  postgres_id=""
  exit 1
fi
postgres_state="created"
run_bounded docker start "$postgres_id"
postgres_start_status=$?
if [[ "$postgres_start_status" -ne 0 ]]; then
  record_primary "command" "postgres-start" "$postgres_start_status" "docker-start-failed"
  exit "$postgres_start_status"
fi
postgres_state="started"

postgres_ready=0
postgres_readiness_started="$(date +%s)"
if ! [[ "$postgres_readiness_started" =~ ^[0-9]+$ ]]; then
  record_primary "readiness" "postgres-readiness" 1 "clock-unavailable"
  exit 1
fi
postgres_readiness_deadline=$((postgres_readiness_started + POSTGRES_READINESS_DEADLINE_SECONDS))
while true; do
  postgres_readiness_now="$(date +%s)"
  if ! [[ "$postgres_readiness_now" =~ ^[0-9]+$ ]]; then
    record_primary "readiness" "postgres-readiness" 1 "clock-unavailable"
    break
  fi
  postgres_readiness_remaining=$((postgres_readiness_deadline - postgres_readiness_now))
  if [[ "$postgres_readiness_remaining" -le 0 ]]; then
    break
  fi
  postgres_operation_timeout="$OPERATION_TIMEOUT_SECONDS"
  if [[ "$postgres_readiness_remaining" -lt "$postgres_operation_timeout" ]]; then
    postgres_operation_timeout="$postgres_readiness_remaining"
  fi
  if run_bounded_until "$postgres_operation_timeout" docker exec "$postgres_id" pg_isready --username "$POSTGRES_USER" --dbname "$POSTGRES_DATABASE" >"$DIAGNOSTIC_DIRECTORY/postgres-readiness.log" 2>&1; then
    postgres_ready=1
    postgres_state="ready"
    break
  fi

  postgres_readiness_now="$(date +%s)"
  postgres_readiness_remaining=$((postgres_readiness_deadline - postgres_readiness_now))
  if [[ "$postgres_readiness_remaining" -le 0 ]]; then
    break
  fi
  postgres_operation_timeout="$OPERATION_TIMEOUT_SECONDS"
  if [[ "$postgres_readiness_remaining" -lt "$postgres_operation_timeout" ]]; then
    postgres_operation_timeout="$postgres_readiness_remaining"
  fi
  if ! postgres_running="$(run_bounded_until "$postgres_operation_timeout" docker inspect --format '{{.State.Running}}' "$postgres_id")"; then
    record_primary "readiness" "postgres-readiness" 1 "container-state-unavailable"
    break
  fi
  if [[ "$postgres_running" != "true" ]]; then
    postgres_state="exited-before-ready"
    record_primary "readiness" "postgres-readiness" 1 "container-exited-before-ready"
    break
  fi

  postgres_readiness_now="$(date +%s)"
  postgres_readiness_remaining=$((postgres_readiness_deadline - postgres_readiness_now))
  if [[ "$postgres_readiness_remaining" -le 0 ]]; then
    break
  fi
  postgres_sleep_seconds="$POSTGRES_READINESS_INTERVAL_SECONDS"
  if [[ "$postgres_readiness_remaining" -lt "$postgres_sleep_seconds" ]]; then
    postgres_sleep_seconds="$postgres_readiness_remaining"
  fi
  sleep "$postgres_sleep_seconds"
done
if [[ "$postgres_ready" -ne 1 ]]; then
  if [[ "$primary_code" -eq 0 ]]; then
    record_primary "readiness" "postgres-readiness" 1 "timeout-after-${POSTGRES_READINESS_DEADLINE_SECONDS}s"
  fi
  exit "$primary_code"
fi

runner_id="$(run_create_bounded docker create --name "$RUNNER_CONTAINER" --network cloudbuild --volume /workspace:/workspace --workdir /workspace \
  --label "$OWNERSHIP_LABEL" \
  --env COREPACK_DEFAULT_TO_LATEST=0 \
  --env "DATABASE_HOST=$POSTGRES_CONTAINER" \
  --env "DATABASE_NAME=$POSTGRES_DATABASE" \
  --env "DATABASE_USERNAME=$POSTGRES_USER" \
  --env "DATABASE_PASSWORD=$POSTGRES_PASSWORD" \
  --env "READINESS_SECRET=$POSTGRES_PASSWORD" \
  "$RUNNER_IMAGE" node scripts/playwright-real-stack-lifecycle.js)"
runner_create_status=$?
if [[ "$runner_create_status" -ne 0 ]]; then
  record_primary "command" "runner-create" "$runner_create_status" "docker-create-failed"
  exit "$runner_create_status"
fi
if ! [[ "$runner_id" =~ ^[a-f0-9]{64}$ ]]; then
  record_primary "command" "runner-create" 1 "invalid-container-id"
  runner_id=""
  exit 1
fi
runner_state="created"
runner_timeout_seconds=$((CLEANUP_RESERVE_DEADLINE_SECONDS - SECONDS))
if [[ "$runner_timeout_seconds" -le 0 ]]; then
  record_primary "command" "runner" 124 "no-runtime-budget-before-cleanup-reserve"
  exit 124
fi
if timeout --signal=TERM --kill-after=15s "${runner_timeout_seconds}s" docker start --attach "$runner_id"; then
  runner_state="completed"
else
  runner_status=$?
  runner_state="failed"
  if [[ -n "$received_signal" ]]; then
    record_primary "signal" "runner" "$primary_code" "$received_signal"
  elif [[ "$runner_status" -eq 130 ]]; then
    record_primary "signal" "runner" 130 "SIGINT"
  elif [[ "$runner_status" -eq 143 ]]; then
    record_primary "signal" "runner" 143 "SIGTERM"
  elif [[ "$runner_status" -eq 124 || "$runner_status" -eq 137 ]]; then
    record_primary "command" "runner" "$runner_status" "bounded-runner-timeout"
  else
    record_primary "command" "runner" "$runner_status" "runner-exit"
  fi
  exit "$primary_code"
fi

run_bounded docker exec "$postgres_id" pg_isready --username "$POSTGRES_USER" --dbname "$POSTGRES_DATABASE" >"$DIAGNOSTIC_DIRECTORY/postgres-final-readiness.log" 2>&1
postgres_final_status=$?
if [[ "$postgres_final_status" -ne 0 ]]; then
  postgres_state="failed-final-readiness"
  record_primary "readiness" "postgres-final-readiness" 1 "pg-isready-exit-${postgres_final_status}"
  exit 1
fi
postgres_state="final-ready"
