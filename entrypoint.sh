#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_COMMAND=(node --import tsx /app/api/src/main.ts)

GRACEFUL_TIMEOUT_SECONDS_RAW="${COGNIS_SHUTDOWN_TIMEOUT_SECONDS:-25}"
if [[ "${GRACEFUL_TIMEOUT_SECONDS_RAW}" =~ ^[0-9]+$ ]]; then
  GRACEFUL_TIMEOUT_SECONDS="${GRACEFUL_TIMEOUT_SECONDS_RAW}"
else
  GRACEFUL_TIMEOUT_SECONDS=25
fi
LOG_FILE_PATH="${LOG_FILE:-/var/log/cognis/app.log}"

json_escape() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  value=${value//$'\f'/\\f}
  value=${value//$'\b'/\\b}
  printf '%s' "$value"
}

app_log() {
  local level="$1"
  local message="$2"
  local escaped_level
  local escaped_message
  local line

  escaped_level=$(json_escape "$level")
  escaped_message=$(json_escape "$message")
  line=$(printf '{"ts":"%s","level":"%s","message":"%s"}' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$escaped_level" "$escaped_message")
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
    if (( waited >= GRACEFUL_TIMEOUT_SECONDS )); then
      app_log "warn" "Graceful shutdown timeout reached after ${GRACEFUL_TIMEOUT_SECONDS}s; sending SIGKILL to app process ${child_pid}."
      kill -KILL "${child_pid}" 2>/dev/null || true
      break
    fi

    sleep 1
    waited=$((waited + 1))
  done
}

trap 'shutdown TERM' TERM
trap 'shutdown INT' INT

if (( $# > 0 )); then
  "$@" &
else
  "${DEFAULT_COMMAND[@]}" &
fi
child_pid=$!

while true; do
  wait "${child_pid}"
  exit_code=$?

  if [[ "${exit_code}" -eq 130 || "${exit_code}" -eq 143 ]] && kill -0 "${child_pid}" 2>/dev/null; then
    continue
  fi

  break
done

app_log "info" "App process exited with status ${exit_code}."
exit "${exit_code}"
