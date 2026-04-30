#!/usr/bin/env bash
set -Eeuo pipefail

GRACEFUL_TIMEOUT_SECONDS="${COGNIS_SHUTDOWN_TIMEOUT_SECONDS:-25}"
LOG_FILE_PATH="${LOG_FILE:-/var/log/cognis/app.log}"

app_log() {
  local level="$1"
  local message="$2"
  local line
  line=$(printf '{"ts":"%s","level":"%s","message":"%s"}' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$level" "$message")
  printf '%s\n' "$line"

  mkdir -p "$(dirname "$LOG_FILE_PATH")"
  printf '%s\n' "$line" >> "$LOG_FILE_PATH"
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

node --import tsx /app/api/src/main.ts "$@" &
child_pid=$!

wait "${child_pid}"
exit_code=$?
app_log "info" "App process exited with status ${exit_code}."
exit "${exit_code}"
