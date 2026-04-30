FROM node:22 AS base
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY api ./api
COPY core ./core
COPY adapters ./adapters
COPY tooling ./tooling
COPY docs ./docs
COPY modules ./modules
COPY ui ./ui
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN npm ci --ignore-scripts \
  && printf '#!/usr/bin/env bash\nnode --import tsx /app/tooling/cli/src/index.ts "$@"\n' > /usr/local/bin/cognisctl \
  && chmod +x /usr/local/bin/cognisctl /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production
ENV COGNIS_UI_DEMO_MODE=0
ENV DB_TYPE=sqlite
ENV LOG_LEVEL=info
ENV LOG_FILE=/var/log/cognis/app.log
ENV COGNIS_ACCESS_TOKEN_TTL_SECONDS=43200

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "/app/tooling/scripts/healthcheck.mjs"]

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
