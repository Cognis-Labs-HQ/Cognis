FROM node:22 AS base
WORKDIR /app

# Create a non-root user before installing dependencies.
RUN groupadd --system cognis \
  && useradd --system --gid cognis --no-create-home cognis

# Copy dependency manifests first so npm ci is cached independently of source changes.
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN npm ci --ignore-scripts \
  && printf '#!/usr/bin/env bash\nnode --import tsx /app/src/tooling/cli/index.ts "$@"\n' > /usr/local/bin/cognisctl \
  && chmod +x /usr/local/bin/cognisctl /usr/local/bin/entrypoint.sh \
  && mkdir -p /app/logs /app/data /app/config \
  && chown -R cognis:cognis /app/node_modules /app/logs /app/data /app/config

# Copy application source after installing dependencies.
COPY src ./src

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

USER cognis
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
