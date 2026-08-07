#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE_PATH="${LOG_FILE:-/app/logs/app.log}"

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

require_environment_value() {
  local variable_name="$1"

  if [[ -z "${!variable_name:-}" ]]; then
    app_log "error" "${variable_name} is required to construct DATABASE_URL for DB_TYPE=${DB_TYPE:-unset}."
    exit 1
  fi
}

encode_url_component() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

construct_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    if [[ -z "${DB_TYPE:-}" ]]; then
      case "${DATABASE_URL}" in
        postgres://*|postgresql://*) export DB_TYPE="postgresql" ;;
        mariadb://*|mysql://*) export DB_TYPE="mariadb" ;;
        *)
          app_log "error" "DB_TYPE must be set to postgresql or mariadb when DATABASE_URL uses an unrecognized scheme."
          exit 1
          ;;
      esac
    fi
    return
  fi

  case "${DB_TYPE:-}" in
    postgresql)
      require_environment_value POSTGRES_HOST
      require_environment_value POSTGRES_PORT
      require_environment_value POSTGRES_DB
      require_environment_value POSTGRES_USER
      require_environment_value POSTGRES_PASSWORD
      local postgres_user postgres_password
      postgres_user="$(encode_url_component "${POSTGRES_USER}")"
      postgres_password="$(encode_url_component "${POSTGRES_PASSWORD}")"
      export DATABASE_URL="postgresql://${postgres_user}:${postgres_password}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
      ;;
    mariadb)
      require_environment_value MARIADB_HOST
      require_environment_value MARIADB_PORT
      require_environment_value MARIADB_DATABASE
      require_environment_value MARIADB_USER
      require_environment_value MARIADB_PASSWORD
      local mariadb_user mariadb_password
      mariadb_user="$(encode_url_component "${MARIADB_USER}")"
      mariadb_password="$(encode_url_component "${MARIADB_PASSWORD}")"
      export DATABASE_URL="mysql://${mariadb_user}:${mariadb_password}@${MARIADB_HOST}:${MARIADB_PORT}/${MARIADB_DATABASE}"
      ;;
    *)
      app_log "error" "Set DATABASE_URL, or set DB_TYPE to postgresql or mariadb with the corresponding database environment variables."
      exit 1
      ;;
  esac
}

construct_database_url
exec "$@"
