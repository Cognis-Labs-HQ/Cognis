# DevOps

## Overview

Cognis ships as a single Docker image built from Node 22. The CI/CD pipeline covers automated testing on every push or pull request and automated image delivery to a container registry on release. Both GitHub Actions and GitLab CI configurations are included in the repository.

The image is intentionally minimal: it installs only production dependencies, runs as a non-root `cognis` user, and exposes a single port. All runtime behaviour is controlled by environment variables, making the image reusable across development, staging, and production environments without rebuilding.

## Responsibilities

- Build a runnable, non-root Node 22 Docker image from the repository source.
- Run install, typecheck, and tests on every push and pull request (CI).
- Build and push the image to a container registry on release (CD).
- Provide database-specific production and development Compose files for PostgreSQL and MariaDB.

Not responsible for: infrastructure provisioning, secrets management beyond env var documentation, or deployment orchestration beyond the image itself.

## Architecture

### Dockerfile

The Dockerfile at `docker/Dockerfile` uses a single `FROM node:22` stage. Key properties:

- Creates a non-root `cognis` system user and group.
- Creates runtime directories `/app/logs`, `/app/data`, `/app/config`, and `/app/media/uploads` with correct ownership before switching user.
- Copies `docker/cognisctl` (the CLI wrapper), `docker/entrypoint.sh`, and `docker/healthcheck.sh` into `/usr/local/bin/` as root before switching to the `cognis` user.
- Copies source and runs `npm ci --ignore-scripts` as the non-root user.
- Exposes port `3000`.
- Runs the compiled API server through the container entrypoint as the default command.
- Includes a `HEALTHCHECK` that calls `/usr/local/bin/healthcheck.sh` every 30 seconds with a 5-second timeout.

```dockerfile
EXPOSE 3000
CMD ["node", "src/api/main.js"]
```

### Environment profiles

Docker defaults are kept outside the image in `docker/env/defaults.env`. PostgreSQL and MariaDB each have separate driver, development, and production env files, selected by their corresponding `docker-compose.<driver>.yaml` or `docker-compose.<driver>.dev.yaml` file. Fill in the blank driver-specific production credentials and encryption key before deployment. Production Compose files use required-variable expressions for database passwords, `DATABASE_URL`, and `DATA_ENCRYPTION_KEY`, so Compose refuses to create the containers until every value is supplied.

```sh
docker compose --env-file docker/env/production.env --env-file docker/env/postgres-production.env -f docker-compose.postgres.yaml up
docker compose --env-file docker/env/production.env --env-file docker/env/mariadb-production.env -f docker-compose.mariadb.yaml up
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

| Variable                          | Default                        | Description                                                    |
| --------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                   | Database backend: `postgresql` or `mariadb`                    |
| `DATABASE_URL`                    | —                              | Connection string for PostgreSQL or MariaDB                    |
| `MEDIA_LOCATION`                  | `/app/media`                   | Root directory for file uploads                                |
| `LOG_LEVEL`                       | `info`                         | Runtime log-stream verbosity: `debug`, `info`, `warn`, `error` |
| `LOG_FILE`                        | `/app/logs/app.log`            | Log file path inside the container                             |
| `LOG_ROTATE_MAX_BYTES`            | `10485760`                     | Rotate active log file when size reaches this many bytes       |
| `LOG_ROTATE_MAX_FILES`            | `10`                           | Number of rotated log archives to keep (`0` keeps none)        |
| `LOG_ROTATE_COMPRESS`             | `true`                         | Compress rotated logs with gzip (`.gz`) when enabled           |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | Bearer token lifetime in seconds                               |
| `COGNIS_CLI_TOKEN_PATH`           | `/app/config/cli-access.token` | Path for the CLI bootstrap token                               |
| `COGNIS_MODULES_ROOT`             | `/app/src/modules`             | Root directory for module discovery                            |
| `COGNIS_GATEWAYS_ROOT`            | `/app/src/gateways`            | Root directory for gateway discovery                           |
| `COGNIS_ADAPTERS_ROOT`            | `/app/src/adapters`            | Root directory for adapter discovery                           |
| `PORT`                            | `3000`                         | HTTP port                                                      |
| `HOST`                            | `cognis`                       | Internal service hostname                                      |
| `EXTERNAL_HOST`                   | —                              | Publicly reachable URL for email links                         |
| `COGNIS_SMTP_HOST`                | —                              | SMTP server hostname; enables the SMTP notification adapter    |
| `COGNIS_UI_DEMO_MODE`             | `0`                            | Set to `1` to enable pre-populated example data                |

The active Docker defaults and setup overrides are listed directly in the env files under `docker/env/`.
