#!/usr/bin/env bash
set -euo pipefail

readonly POSTGRES_IMAGE="postgres:16-bookworm@sha256:bb3e1a57e5407e0a5280b4211980a5e537f4abd234a87014ac979849a78dd825"
readonly RUNNER_IMAGE="node@sha256:4d676821dff059fd00d277ee4261ef34ea712317fed0737c03941481b5760c96"
readonly POSTGRES_USER="readiness"
readonly POSTGRES_DATABASE="readiness"

safe_build_id="$(tr -cd '[:alnum:]' <<<"${BUILD_ID:?BUILD_ID is required}" | tr '[:upper:]' '[:lower:]')"
if [[ -z "$safe_build_id" ]]; then
  printf 'BUILD_ID must contain at least one alphanumeric character.\n' >&2
  exit 1
fi
readonly POSTGRES_CONTAINER="tb122-readiness-postgres-${safe_build_id:0:32}"
readonly POSTGRES_PASSWORD="in-build-${safe_build_id}"

cleanup_postgres() {
  docker rm --force "$POSTGRES_CONTAINER" >/dev/null 2>&1 || :
}

trap cleanup_postgres EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

wait_for_postgres() {
  for attempt in $(seq 1 30); do
    if docker exec "$POSTGRES_CONTAINER" pg_isready --username "$POSTGRES_USER" --dbname "$POSTGRES_DATABASE" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  printf 'PostgreSQL readiness timed out. Last container log lines follow.\n' >&2
  docker logs --tail 40 "$POSTGRES_CONTAINER" >&2
  return 1
}

docker run --detach --name "$POSTGRES_CONTAINER" --network cloudbuild \
  --env "POSTGRES_USER=$POSTGRES_USER" \
  --env "POSTGRES_DB=$POSTGRES_DATABASE" \
  --env "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
  "$POSTGRES_IMAGE" >/dev/null
wait_for_postgres

docker run --rm --interactive --network cloudbuild --volume /workspace:/workspace --workdir /workspace \
  --env COREPACK_DEFAULT_TO_LATEST=0 \
  --env "DATABASE_HOST=$POSTGRES_CONTAINER" \
  --env "DATABASE_NAME=$POSTGRES_DATABASE" \
  --env "DATABASE_USERNAME=$POSTGRES_USER" \
  --env "DATABASE_PASSWORD=$POSTGRES_PASSWORD" \
  --env "READINESS_SECRET=$POSTGRES_PASSWORD" \
  "$RUNNER_IMAGE" bash -s <<'RUNNER'
set -euo pipefail

cms_pid=""
app_pid=""

stop_processes() {
  local status=$?
  trap - EXIT

  if [[ "$status" -ne 0 ]]; then
    printf 'Real-stack readiness failed. Last service log lines follow.\n' >&2
    for log_path in /tmp/strapi-readiness.log /tmp/next-readiness.log; do
      if [[ -f "$log_path" ]]; then
        tail -n 40 "$log_path" >&2 || :
      fi
    done
  fi

  for pid in "$app_pid" "$cms_pid"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || :
      wait "$pid" 2>/dev/null || :
    fi
  done
  exit "$status"
}

trap stop_processes EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

wait_for_http() {
  local service="$1" url="$2"
  for attempt in $(seq 1 45); do
    if node -e 'fetch(process.argv[1]).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))' "$url"; then
      return 0
    fi
    sleep 2
  done
  printf '%s readiness timed out.\n' "$service" >&2
  return 1
}

cd /workspace/teleferico-cms
npm ci
export NODE_ENV=test DATABASE_CLIENT=postgres DATABASE_PORT=5432 DATABASE_SSL=false
export APP_KEYS="$READINESS_SECRET-app-1,$READINESS_SECRET-app-2"
export API_TOKEN_SALT="$READINESS_SECRET-api" ADMIN_JWT_SECRET="$READINESS_SECRET-admin"
export TRANSFER_TOKEN_SALT="$READINESS_SECRET-transfer" JWT_SECRET="$READINESS_SECRET-jwt"
npm run build
npm run start >/tmp/strapi-readiness.log 2>&1 &
cms_pid=$!
wait_for_http "Strapi" "http://127.0.0.1:1337/admin/init"

cd /workspace/teleferico-app
corepack enable
test "$(corepack pnpm --version)" = "10.33.0"
pnpm install --frozen-lockfile
export APP_INTERNAL_BASE_URL=http://127.0.0.1:3000 AUTH_SECRET="$READINESS_SECRET-auth"
export AUTH_TRUST_HOST=true BUILD_STRAPI_BASE_URL=http://127.0.0.1:1337
export NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
pnpm run dev -- --hostname 0.0.0.0 --port 3000 >/tmp/next-readiness.log 2>&1 &
app_pid=$!
wait_for_http "Next.js" "http://127.0.0.1:3000/api/auth/providers"
printf 'Real PostgreSQL, Strapi, and Next.js readiness passed.\n'
RUNNER
