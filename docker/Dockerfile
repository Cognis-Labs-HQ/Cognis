FROM node:22 AS base
ARG COGNIS_ASSET_VERSION=development
WORKDIR /app

# Root-only setup: create the non-root user, runtime directories, and system-wide scripts.
# Everything that requires root is done here so subsequent layers run as cognis.
RUN groupadd --system cognis \
  && useradd --system --gid cognis --home-dir /home/cognis --create-home cognis \
  && mkdir -p logs data config media/uploads \
  && chown -R cognis:cognis .

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

# Runtime defaults live in docker/env and are selected by Docker Compose.

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/usr/local/bin/healthcheck.sh"]

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/server/src/api/main.js"]
