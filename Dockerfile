FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY api ./api
COPY core ./core
COPY adapters ./adapters
COPY tooling ./tooling
COPY docs ./docs
COPY modules ./modules
COPY ui ./ui

RUN npm ci --ignore-scripts

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
