#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
RUNTIME_ENV_FILE="${REPOSITORY_ROOT}/docker/env/runtime.env"
EDGE_ENV_FILE="${REPOSITORY_ROOT}/docker/env/edge.env"

prompt() {
  local variable_name="$1"
  local message="$2"
  local default_value="${3:-}"
  local value

  if [[ -n "${default_value}" ]]; then
    read -r -p "${message} [${default_value}]: " value
    value="${value:-${default_value}}"
  else
    read -r -p "${message}: " value
  fi
  printf -v "${variable_name}" '%s' "${value}"
}

prompt_required() {
  local variable_name="$1"
  local message="$2"
  local value=""

  while [[ -z "${value}" ]]; do
    read -r -p "${message}: " value
  done
  printf -v "${variable_name}" '%s' "${value}"
}

prompt_secret() {
  local variable_name="$1"
  local message="$2"
  local default_value="${3:-}"
  local value

  if [[ -n "${default_value}" ]]; then
    read -r -s -p "${message} [press Enter to use generated value]: " value
    value="${value:-${default_value}}"
  else
    while [[ -z "${value:-}" ]]; do
      read -r -s -p "${message}: " value
      printf '\n'
    done
    printf -v "${variable_name}" '%s' "${value}"
    return
  fi
  printf '\n'
  printf -v "${variable_name}" '%s' "${value}"
}

random_secret() {
  node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
}

echo "Cognis environment setup"
echo "This creates isolated application and edge env files and selects the default Compose database."

prompt deployment "Deployment type (development/production)" "production"
case "${deployment}" in
  development|production) ;;
  *) echo "Deployment type must be development or production." >&2; exit 1 ;;
esac

prompt database_driver "Database driver (postgresql/mariadb)" "postgresql"
case "${database_driver}" in
  postgresql)
    compose_target="docker-compose.postgres.yaml"
    database_port_default="5432"
    ;;
  mariadb)
    compose_target="docker-compose.mariadb.yaml"
    database_port_default="3306"
    ;;
  *) echo "Database driver must be postgresql or mariadb." >&2; exit 1 ;;
esac

prompt database_host "Database host" "db"
prompt database_port "Database port" "${database_port_default}"
prompt database_name "Database name" "cognis"
prompt database_user "Database user" "cognis"
prompt cognis_host "Cognis service hostname" "cognis"
prompt_required external_host "Public Cognis URL (for example, https://cognis.example.com)"
prompt_required contact_email "Contact email"

prompt reverse_proxy "Will a separate reverse proxy or CDN terminate HTTPS before cognis-web? (yes/no)" "no"
case "${reverse_proxy}" in
  yes|y|true|1) edge_tls_mode="deferred" ;;
  no|n|false|0) edge_tls_mode="terminate" ;;
  *) echo "Reverse proxy answer must be yes or no." >&2; exit 1 ;;
esac
prompt_secret database_password "Database password" "$(random_secret)"
prompt_secret encryption_key "Data encryption key" "$(random_secret)"

umask 077
mkdir -p "$(dirname -- "${RUNTIME_ENV_FILE}")"
{
  printf 'NODE_ENV=%s\n' "${deployment}"
  printf 'DB_TYPE=%s\n' "${database_driver}"
  printf 'HOST=%s\n' "${cognis_host}"
  printf 'EXTERNAL_HOST=%s\n' "${external_host}"
  printf 'CONTACT_EMAIL=%s\n' "${contact_email}"
  printf 'DATA_ENCRYPTION_KEY=%s\n' "${encryption_key}"
  if [[ "${database_driver}" == "postgresql" ]]; then
    printf 'POSTGRES_HOST=%s\n' "${database_host}"
    printf 'POSTGRES_PORT=%s\n' "${database_port}"
    printf 'POSTGRES_DB=%s\n' "${database_name}"
    printf 'POSTGRES_USER=%s\n' "${database_user}"
    printf 'POSTGRES_PASSWORD=%s\n' "${database_password}"
    printf 'POSTGRES_POOL_MAX=10\nPOSTGRES_POOL_IDLE_TIMEOUT_MS=30000\n'
    printf 'POSTGRES_POOL_CONNECTION_TIMEOUT_MS=5000\nPOSTGRES_POOL_STATEMENT_TIMEOUT_MS=\n'
  else
    printf 'MARIADB_HOST=%s\n' "${database_host}"
    printf 'MARIADB_PORT=%s\n' "${database_port}"
    printf 'MARIADB_DATABASE=%s\n' "${database_name}"
    printf 'MARIADB_USER=%s\n' "${database_user}"
    printf 'MARIADB_PASSWORD=%s\n' "${database_password}"
    printf 'MARIADB_ROOT_PASSWORD=%s\n' "$(random_secret)"
    printf 'MARIADB_POOL_MAX=10\nMARIADB_POOL_IDLE_TIMEOUT_MS=30000\n'
    printf 'MARIADB_POOL_CONNECTION_TIMEOUT_MS=5000\n'
  fi
} > "${RUNTIME_ENV_FILE}"

{
  printf 'COGNIS_EDGE_TLS_MODE=%s\n' "${edge_tls_mode}"
  printf 'COGNIS_EDGE_TLS_CERTIFICATE=/etc/nginx/tls/fullchain.pem\n'
  printf 'COGNIS_EDGE_TLS_CERTIFICATE_KEY=/etc/nginx/tls/privkey.pem\n'
} > "${EDGE_ENV_FILE}"

ln -sfn "${compose_target}" "${REPOSITORY_ROOT}/docker-compose.yaml"

echo "Configuration written to docker/env/runtime.env and docker/env/edge.env."
echo "docker-compose.yaml now selects ${database_driver}."
echo "Start Cognis with: docker compose up --build"
