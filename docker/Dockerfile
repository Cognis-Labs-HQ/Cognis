FROM node:22 AS base
WORKDIR /app

# Root-only setup: create the non-root user, runtime directories, and system-wide scripts.
# Everything that requires root is done here so subsequent layers run as cognis.
RUN groupadd --system cognis \
  && useradd --system --gid cognis --home-dir /home/cognis --create-home cognis \
  && mkdir -p /app/logs /app/data /app/config \
  && chown -R cognis:cognis /app

# Install the entrypoint script, the cognisctl wrapper, and the healthcheck into PATH while still root.
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chmod=755 docker/cognisctl /usr/local/bin/cognisctl
COPY --chmod=755 docker/healthcheck.sh /usr/local/bin/healthcheck.sh

# All remaining steps run as the non-root user; no chown is needed.
USER cognis

# Copy dependency manifests first so npm ci is cached independently of source changes.
# Workspace package.json files must be present so npm can create the inter-package symlinks.
COPY --chown=cognis:cognis package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY --chown=cognis:cognis src/core/package.json ./src/core/
COPY --chown=cognis:cognis src/api/package.json ./src/api/
COPY --chown=cognis:cognis src/adapters/auth-ldap/package.json ./src/adapters/auth-ldap/
COPY --chown=cognis:cognis src/adapters/auth-saml/package.json ./src/adapters/auth-saml/
COPY --chown=cognis:cognis src/adapters/auth-sso-oidc/package.json ./src/adapters/auth-sso-oidc/
COPY --chown=cognis:cognis src/adapters/db-mariadb/package.json ./src/adapters/db-mariadb/
COPY --chown=cognis:cognis src/adapters/db-memory/package.json ./src/adapters/db-memory/
COPY --chown=cognis:cognis src/adapters/db-postgres/package.json ./src/adapters/db-postgres/
COPY --chown=cognis:cognis src/adapters/db-sqlite/package.json ./src/adapters/db-sqlite/
COPY --chown=cognis:cognis src/adapters/file-local/package.json ./src/adapters/file-local/
COPY --chown=cognis:cognis src/tooling/cli/package.json ./src/tooling/cli/
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
  CMD ["/usr/local/bin/healthcheck.sh"]

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
