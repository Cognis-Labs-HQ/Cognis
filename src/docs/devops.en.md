# DevOps

## Overview

Cognis ships as a single Docker image built from Node 22. The CI/CD pipeline covers automated testing on every push or pull request and automated image delivery to a container registry on release. Both GitHub Actions and GitLab CI configurations are included in the repository.

The image is intentionally minimal: it installs only production dependencies, runs as a non-root `cognis` user, and exposes a single port. All runtime behaviour is controlled by environment variables, making the image reusable across development, staging, and production environments without rebuilding.

## Responsibilities

- Build a runnable, non-root Node 22 Docker image from the repository source.
- Run install, typecheck, and tests on every push and pull request (CI).
- Build and push the image to a container registry on release (CD).
- Provide `docker-compose.yaml` for local development with a PostgreSQL database.

Not responsible for: infrastructure provisioning, secrets management beyond env var documentation, or deployment orchestration beyond the image itself.

## Architecture

### Dockerfile

The Dockerfile at `docker/Dockerfile` uses a single `FROM node:22` stage. Key properties:

- Creates a non-root `cognis` system user and group.
- Creates runtime directories `/app/logs`, `/app/data`, `/app/config`, and `/app/media/uploads` with correct ownership before switching user.
- Copies `docker/cognisctl` (the CLI wrapper), `docker/entrypoint.sh`, and `docker/healthcheck.sh` into `/usr/local/bin/` as root before switching to the `cognis` user.
- Copies source and runs `npm ci --ignore-scripts` as the non-root user.
- Exposes port `3000`.
- Runs `node --import tsx /app/src/api/main.ts` as the default command.
- Includes a `HEALTHCHECK` that calls `/usr/local/bin/healthcheck.sh` every 30 seconds with a 5-second timeout.

```dockerfile
EXPOSE 3000
ENV NODE_ENV=production
ENV DB_TYPE=sqlite
ENV SQLITE_PATH=/app/data/cognis.sqlite
ENV LOG_LEVEL=info
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
```

### GitHub Actions

Two workflows live in `.github/workflows/`:

**`ci.yml`** — Runs on every push and pull request:

1. `npm ci` — install dependencies.
2. TypeScript typecheck.
3. `npm test` — full test suite.

**`docker.yml`** — Runs on release publish or manual dispatch:

1. Build the Docker image.
2. Push to GitHub Container Registry (`ghcr.io/<owner>/cognis`).

### GitLab CI

`.gitlab-ci.yml` defines two stages:

**`test`** — Runs on every branch commit and tag using `node:22-alpine`:

```
npm ci && npm run ci:test
```

**`docker-build`** — Runs on tag releases and manual web-triggered pipelines using `docker:27` with DinD. Builds and pushes to `registry.gitlab.firehawk-systems.com/firehawk/cognis:<sha>`.

## Configuration

Environment variables needed to run the application:

| Variable                          | Default                        | Description                                                 |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `DB_TYPE`                         | `sqlite`                       | Database backend: `sqlite`, `postgresql`, or `mariadb`      |
| `DATABASE_URL`                    | —                              | Connection string for PostgreSQL or MariaDB                 |
| `SQLITE_PATH`                     | `/app/data/cognis.sqlite`      | SQLite file path (only when `DB_TYPE=sqlite`)               |
| `MEDIA_LOCATION`                  | `/app/media`                   | Root directory for file uploads                             |
| `LOG_LEVEL`                       | `info`                         | Log verbosity: `debug`, `info`, `warn`, `error`             |
| `LOG_FILE`                        | `/app/logs/app.log`            | Log file path inside the container                          |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | Bearer token lifetime in seconds                            |
| `COGNIS_CLI_TOKEN_PATH`           | `/app/config/cli-access.token` | Path for the CLI bootstrap token                            |
| `COGNIS_MODULES_ROOT`             | `/app/src/modules`             | Root directory for module discovery                         |
| `COGNIS_GATEWAYS_ROOT`            | `/app/src/gateways`            | Root directory for gateway discovery                        |
| `COGNIS_ADAPTERS_ROOT`            | `/app/src/adapters`            | Root directory for adapter discovery                        |
| `PORT`                            | `3000`                         | HTTP port                                                   |
| `HOST`                            | `cognis`                       | Internal service hostname                                   |
| `EXTERNAL_HOST`                   | —                              | Publicly reachable URL for email links                      |
| `COGNIS_SMTP_HOST`                | —                              | SMTP server hostname; enables the SMTP notification adapter |
| `COGNIS_UI_DEMO_MODE`             | `0`                            | Set to `1` to enable pre-populated example data             |

A full reference with comments is in `env.example` at the repository root.
