FROM node:22 AS base
ARG COGNIS_ASSET_VERSION=development
ENV COGNIS_ASSET_VERSION=${COGNIS_ASSET_VERSION}
ENV NODE_ENV=production \
  DB_TYPE=postgresql \
  HOST=cognis \
  EXTERNAL_HOST=http://localhost \
  CONTACT_EMAIL=admin@localhost \
  COGNIS_UI_ASSET_MANIFEST=/app/dist/ui/asset-manifest.json \
  COGNIS_UI_DIST_ROOT=/app/dist/ui \
  COGNIS_UI_DEMO_MODE=0 \
  LOG_LEVEL=info \
  LOG_FILE=/app/logs/app.log \
  COGNIS_ACCESS_TOKEN_TTL_SECONDS=43200 \
  MEDIA_LOCATION=/app/media \
  COGNIS_MODULES_ROOT=/app/dist/server/src/modules \
  COGNIS_GATEWAYS_ROOT=/app/dist/server/src/gateways \
  COGNIS_ADAPTERS_ROOT=/app/dist/server/src/adapters \
  COGNIS_CLI_TOKEN_PATH=/app/config/cli-access.token
WORKDIR /app

# Root-only setup: create the non-root user, runtime directories, and system-wide scripts.
# Everything that requires root is done here so subsequent layers run as cognis.
RUN groupadd --system cognis \
  && useradd --system --gid cognis --home-dir /home/cognis --create-home cognis \
  && mkdir -p /app/logs /app/data /app/config /app/media/uploads \
  && chown -R cognis:cognis /app

# Install the entrypoint script, the cognisctl wrapper, and the healthcheck into PATH while still root.
COPY --chmod=755 docker/cognisctl /usr/local/bin/cognisctl
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chmod=755 docker/healthcheck.sh /usr/local/bin/healthcheck.sh

# All remaining steps run as the non-root user; no chown is needed.
USER cognis

COPY --chown=cognis:cognis package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY --chown=cognis:cognis src ./src
RUN npm ci --ignore-scripts --include=dev
RUN npm run build && npm run check:ui-build && npm run check:server-build
RUN npm prune --ignore-scripts --omit=dev

EXPOSE 3000

# Runtime defaults live in docker/env and are selected by Docker Compose.

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/usr/local/bin/healthcheck.sh"]

STOPSIGNAL SIGTERM
WORKDIR /app/dist/server
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "src/api/main.js"]
