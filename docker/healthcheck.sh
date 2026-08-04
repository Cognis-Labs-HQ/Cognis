#!/usr/bin/env bash
# Lightweight healthcheck for the Cognis API.
#
# Prefers wget (available in node:22/Debian) for a low-overhead HTTP probe.
# Falls back to curl, then to the Node.js implementation as a last resort.
# Exits 0 when the API returns HTTP 200, non-zero otherwise.
set -eo pipefail

PORT="${PORT:-3000}"
URL="http://127.0.0.1:${PORT}/api/v1/system/health"

if command -v wget >/dev/null 2>&1; then
  wget -qO- --timeout=4 --tries=1 "$URL" >/dev/null
elif command -v curl >/dev/null 2>&1; then
  curl -sf --max-time 4 "$URL" >/dev/null
else
  exec node src/tooling/scripts/healthcheck.mjs
fi
