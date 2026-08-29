# DevOps

## Overview

Cognis ships a Node 24 application image and composes it with the upstream `nginx:stable-alpine` image. The CI/CD pipeline covers automated testing on every push or pull request and automated image delivery to a container registry on release. Both GitHub Actions and GitLab CI configurations are included in the repository.

The application image installs production dependencies, runs as the non-root `cognis` user, and exposes one internal port. Compose places generic nginx in front of it with a mounted native configuration template. Runtime behaviour is controlled through environment variables and mounted configuration files.

## Responsibilities

- Build a runnable, non-root Node 24 application image from the repository source.
- Run install, typecheck, and tests on every push and pull request (CI).
- Build and push the application image to a container registry on release (CD).
- Provide database-specific production and development Compose files for PostgreSQL and MariaDB.

Not responsible for: infrastructure provisioning, secrets management beyond env var documentation, or deployment orchestration beyond the image itself.

## Architecture

### Dockerfile

The Dockerfile at `docker/Dockerfile` uses a single `FROM node:24` stage. Key properties:

- Creates a non-root `cognis` system user and group.
- Creates runtime directories `/app/logs`, `/app/data`, `/app/config`, and `/app/media/uploads` with correct ownership before switching user.
- Copies `docker/cognisctl` (the CLI wrapper), `docker/entrypoint.sh`, and `docker/healthcheck.sh` into `/usr/local/bin/` as root before switching to the `cognis` user.
- Copies source, installs build dependencies, verifies both builds, and removes development-only packages as the non-root user.
- Exposes port `3000`.
- Runs the compiled API server through the container entrypoint as the default command.
- Includes a `HEALTHCHECK` that calls `/usr/local/bin/healthcheck.sh` every 30 seconds with a 5-second timeout.

```dockerfile
EXPOSE 3000
CMD ["node", "src/api/main.js"]
```

### Container defaults

Runnable defaults remain in the application image, while database credentials and `DATA_ENCRYPTION_KEY` must be supplied by the deployment environment. Each Compose profile passes the matching PostgreSQL or MariaDB connection fields to the application container, and the entrypoint compiles them into `DATABASE_URL`. Other deployments may provide either the same provider-specific fields or a complete `DATABASE_URL`.

The web profile uses the unmodified `nginx:stable-alpine` image with `docker/cognis-web/default.conf.template` mounted into nginx's native template directory. It provides HTTP caching and proxy headers without a custom web image or entrypoint. Deployments that terminate TLS in nginx can mount their own native nginx TLS configuration; Kubernetes ingress controllers and external proxies can terminate TLS without changing the Cognis image.

Compose reads required secrets from its process environment and fails with a clear error when any value is missing. Supply deployment-managed values before starting the PostgreSQL profile:

```sh
export POSTGRES_PASSWORD='<database password>'
export DATA_ENCRYPTION_KEY='<64-character encryption key>'
docker compose up --build
```

For MariaDB, set `MARIADB_PASSWORD` and start `docker-compose.mariadb.yaml`; the container generates and logs a random root password, so `MARIADB_ROOT_PASSWORD` is neither required nor read. Orchestrators such as Kubernetes should inject these values through their native secret-management facilities; they do not need a repository setup script.

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

`.gitlab-ci.yml` defines two jobs:

**`test`** — Runs on every branch commit and tag using `node:24-alpine`:

```
apk add ripgrep python3 build-base
npm ci
npm test
```

**`publish`** — Runs with `docker:27` and DinD. It builds the application image from `docker/Dockerfile`, then publishes `$CI_REGISTRY_IMAGE:<ref>` and `$CI_REGISTRY_IMAGE:sha-<commit>`. On `master`, it also publishes `latest`.

## Configuration

Environment variables needed to run the application:

| Variable                                 | Default             | Description                                                    |
| ---------------------------------------- | ------------------- | -------------------------------------------------------------- |
| `DB_TYPE`                                | `postgresql`        | Database backend: `postgresql` or `mariadb`                    |
| `DATABASE_URL`                           | —                   | Complete connection URL; alternative to provider fields        |
| `POSTGRES_HOST` / `MARIADB_HOST`         | —                   | Database service hostname                                      |
| `POSTGRES_PORT` / `MARIADB_PORT`         | —                   | Database service port                                          |
| `POSTGRES_DB` / `MARIADB_DATABASE`       | —                   | Database name                                                  |
| `POSTGRES_USER` / `MARIADB_USER`         | —                   | Database account                                               |
| `POSTGRES_PASSWORD` / `MARIADB_PASSWORD` | —                   | Database account password                                      |
| `MEDIA_LOCATION`                         | `/app/media`        | Root directory for file uploads                                |
| `LOG_LEVEL`                              | `info`              | Runtime log-stream verbosity: `debug`, `info`, `warn`, `error` |
| `LOG_FILE`                               | `/app/logs/app.log` | Log file path inside the container                             |
| `LOG_ROTATE_MAX_BYTES`                   | `10485760`          | Rotate active log file when size reaches this many bytes       |
| `LOG_ROTATE_MAX_FILES`                   | `10`                | Number of rotated log archives to keep (`0` keeps none)        |
| `LOG_ROTATE_COMPRESS`                    | `true`              | Compress rotated logs with gzip (`.gz`) when enabled           |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS`        | `43200`             | Bearer token lifetime in seconds                               |
| `PORT`                                   | `3000`              | HTTP port                                                      |
| `HOST`                                   | `cognis`            | Internal application service hostname                          |
| `EXTERNAL_HOST`                          | —                   | Required publicly reachable URL for links                      |
| `CONTACT_EMAIL`                          | `admin@localhost`   | Public support contact                                         |
| `COGNIS_SMTP_HOST`                       | —                   | SMTP server hostname; enables the SMTP notification adapter    |
| `COGNIS_UI_DEMO_MODE`                    | `0`                 | Set to `1` to enable pre-populated example data                |

Application defaults are declared in `docker/Dockerfile`; the nginx proxy behavior is declared in `docker/cognis-web/default.conf.template`.
