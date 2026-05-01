FROM node:22 AS base
WORKDIR /app

# Root-only setup: create the non-root user, runtime directories, and system-wide scripts.
# Everything that requires root is done here so subsequent layers run as cognis.
RUN groupadd --system cognis \
  && useradd --system --gid cognis --no-create-home cognis \
  && mkdir -p /app/logs /app/data /app/config \
  && chown cognis:cognis /app/logs /app/data /app/config

# Install the entrypoint script and the cognisctl wrapper into PATH while still root.
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chmod=755 cognisctl /usr/local/bin/cognisctl

# All remaining steps run as the non-root user; no chown is needed.
USER cognis

# Copy dependency manifests first so npm ci is cached independently of source changes.
COPY --chown=cognis:cognis package.json package-lock.json tsconfig.json tsconfig.base.json ./
RUN npm ci --ignore-scripts

# Copy application source after installing dependencies.
COPY --chown=cognis:cognis src ./src

EXPOSE 3000

ENV NODE_ENV=production
ENV COGNIS_UI_DEMO_MODE=0
ENV DB_TYPE=sqlite
ENV SQLITE_PATH=/app/data/cognis.sqlite
ENV LOG_LEVEL=info
ENV LOG_FILE=/app/logs/app.log
ENV COGNIS_ACCESS_TOKEN_TTL_SECONDS=43200
ENV COGNIS_MODULES_ROOT=/app/src/modules
ENV COGNIS_CLI_TOKEN_PATH=/app/config/cli-access.token

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "/app/src/tooling/scripts/healthcheck.mjs"]

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
