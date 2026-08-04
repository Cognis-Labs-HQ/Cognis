#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE_PATH="${LOG_FILE:-/app/logs/app.log}"
SHUTDOWN_TIMEOUT_SECONDS=25
DEFAULT_DATA_ENCRYPTION_KEY="not-secure-change-me"

# These paths are properties of the image layout, not deployment configuration.
export COGNIS_MODULES_ROOT="/app/dist/server/src/modules"
export COGNIS_GATEWAYS_ROOT="/app/dist/server/src/gateways"
export COGNIS_ADAPTERS_ROOT="/app/dist/server/src/adapters"
export COGNIS_CLI_TOKEN_PATH="/app/config/cli-access.token"
readonly COGNIS_MODULES_ROOT COGNIS_GATEWAYS_ROOT COGNIS_ADAPTERS_ROOT COGNIS_CLI_TOKEN_PATH

app_log() {
  local level="$1"
  local message="$2"
  local line

  line=$(printf '{"ts":"%s","level":"%s","message":"%s"}' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$level" "$message")
  printf '%s\n' "$line"

  if mkdir -p "$(dirname "$LOG_FILE_PATH")" 2>/dev/null; then
    printf '%s\n' "$line" >> "$LOG_FILE_PATH" 2>/dev/null || true
  fi
}

shutdown() {
  local signal="$1"

  if [[ -z "${child_pid:-}" ]]; then
    return 0
  fi

  app_log "info" "Entrypoint received ${signal}; forwarding signal to app process ${child_pid}."
  kill -"${signal}" "${child_pid}" 2>/dev/null || true

  local waited=0
  while kill -0 "${child_pid}" 2>/dev/null; do
    if (( waited >= SHUTDOWN_TIMEOUT_SECONDS )); then
      app_log "warn" "Graceful shutdown timeout reached after ${SHUTDOWN_TIMEOUT_SECONDS}s; sending SIGKILL to app process ${child_pid}."
      kill -KILL "${child_pid}" 2>/dev/null || true
      break
    fi

    sleep 1
    waited=$((waited + 1))
  done
}

trap 'shutdown TERM' TERM
trap 'shutdown INT' INT

require_environment_value() {
  local variable_name="$1"
  local setup_file="$2"

  if [[ -z "${!variable_name:-}" ]]; then
    app_log "error" "${variable_name} must be set in ${setup_file}. Run ./setup.sh from the repository root to configure Cognis."
    exit 1
  fi
}

encode_url_component() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

construct_database_url() {
  require_environment_value HOST docker/env/runtime.env
  require_environment_value EXTERNAL_HOST docker/env/runtime.env
  require_environment_value CONTACT_EMAIL docker/env/runtime.env
  require_environment_value DATA_ENCRYPTION_KEY docker/env/runtime.env

  case "${DB_TYPE:-}" in
    postgresql)
      require_environment_value POSTGRES_HOST docker/env/runtime.env
      require_environment_value POSTGRES_PORT docker/env/runtime.env
      require_environment_value POSTGRES_DB docker/env/runtime.env
      require_environment_value POSTGRES_USER docker/env/runtime.env
      require_environment_value POSTGRES_PASSWORD docker/env/runtime.env
      local postgres_user postgres_password
      postgres_user="$(encode_url_component "${POSTGRES_USER}")"
      postgres_password="$(encode_url_component "${POSTGRES_PASSWORD}")"
      export DATABASE_URL="postgresql://${postgres_user}:${postgres_password}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
      ;;
    mariadb)
      require_environment_value MARIADB_HOST docker/env/runtime.env
      require_environment_value MARIADB_PORT docker/env/runtime.env
      require_environment_value MARIADB_DATABASE docker/env/runtime.env
      require_environment_value MARIADB_USER docker/env/runtime.env
      require_environment_value MARIADB_PASSWORD docker/env/runtime.env
      local mariadb_user mariadb_password
      mariadb_user="$(encode_url_component "${MARIADB_USER}")"
      mariadb_password="$(encode_url_component "${MARIADB_PASSWORD}")"
      export DATABASE_URL="mysql://${mariadb_user}:${mariadb_password}@${MARIADB_HOST}:${MARIADB_PORT}/${MARIADB_DATABASE}"
      ;;
    *)
      app_log "error" "DB_TYPE must be set to postgresql or mariadb in docker/env/runtime.env. Run ./setup.sh to configure Cognis."
      exit 1
      ;;
  esac
}

construct_database_url

if [[ "${DATA_ENCRYPTION_KEY:-}" == "${DEFAULT_DATA_ENCRYPTION_KEY}" ]]; then
  app_log "warn" "DATA_ENCRYPTION_KEY is using the default insecure value. Set a unique key outside local development."
fi

"$@" &
child_pid=$!

set +e
wait "${child_pid}"
exit_code=$?
app_log "info" "App process exited with status ${exit_code}."
exit "${exit_code}"
