FROM node:22 AS base
ARG COGNIS_ASSET_VERSION=development
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
RUN npm ci --ignore-scripts
RUN npm run build && npm run check:ui-build && npm run check:server-build

EXPOSE 3000

ENV NODE_ENV=production
ENV COGNIS_ASSET_VERSION=${COGNIS_ASSET_VERSION}
ENV COGNIS_UI_ASSET_MANIFEST=/app/dist/ui/asset-manifest.json
ENV COGNIS_UI_DIST_ROOT=/app/dist/ui
ENV COGNIS_UI_DEMO_MODE=0
ENV DB_TYPE=postgresql
ENV DATABASE_URL=
ENV LOG_LEVEL=info
ENV LOG_FILE=/app/logs/app.log
ENV COGNIS_ACCESS_TOKEN_TTL_SECONDS=43200
ENV COGNIS_MODULES_ROOT=/app/dist/server/src/modules
ENV COGNIS_GATEWAYS_ROOT=/app/dist/server/src/gateways
ENV COGNIS_ADAPTERS_ROOT=/app/dist/server/src/adapters
ENV COGNIS_CLI_TOKEN_PATH=/app/config/cli-access.token
ENV MEDIA_LOCATION=/app/media
ENV HOST=cognis
ENV EXTERNAL_HOST=
ENV CONTACT_EMAIL=
ENV DATA_ENCRYPTION_KEY=not-secure-change-me

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/usr/local/bin/healthcheck.sh"]

STOPSIGNAL SIGTERM
WORKDIR /app/dist/server
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "src/api/main.js"]
