# DevOps

## Overview

Cognis ships as a Node 22 application Docker image plus a `cognis-web` Nginx web image. The CI/CD pipeline covers automated testing on every push or pull request and automated image delivery to a container registry on release. Both GitHub Actions and GitLab CI configurations are included in the repository.

The application image is intentionally minimal: it installs only production dependencies, runs as a non-root `cognis` user, and exposes a single internal port. Production Compose places the `cognis-web` web image in front of it; GitLab CI publishes the same web artifact as `$CI_REGISTRY_IMAGE/cognis-web:<ref>` and `:sha-<commit>`. All runtime behaviour is controlled by environment variables, making the images reusable across development, staging, and production environments without rebuilding.

## Responsibilities

- Build a runnable, non-root Node 22 application image from the repository source.
- Build a `cognis-web` web image from `docker/cognis-web` for published TLS traffic.
- Run install, typecheck, and tests on every push and pull request (CI).
- Build and push both the application and `cognis-web` images to a container registry on release (CD).
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

### Container defaults

Runnable defaults are embedded in the application and web images. `docker compose up --build` starts the PostgreSQL stack without generated environment files; use `docker compose -f docker-compose.mariadb.yaml up --build` for MariaDB. Any deployment may override image defaults through its normal environment configuration. The application entrypoint only executes the configured command.

The web image listens on HTTP by default. It also enables HTTPS and redirects HTTP to HTTPS when both configured certificate paths exist and are readable. No TLS mode variable is required.

```sh
docker compose up --build
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

`.gitlab-ci.yml` defines two jobs:

**`test`** — Runs on every branch commit and tag using `node:22-alpine`:

```
apk add ripgrep python3 build-base
npm ci
npm test
```

**`publish`** — Runs with `docker:27` and DinD. It builds the application image from `docker/Dockerfile` and the web image from `docker/cognis-web/Dockerfile`, then publishes `$CI_REGISTRY_IMAGE:<ref>`, `$CI_REGISTRY_IMAGE:sha-<commit>`, `$CI_REGISTRY_IMAGE/cognis-web:<ref>`, and `$CI_REGISTRY_IMAGE/cognis-web:sha-<commit>`. On `master`, it also publishes `latest` for both images.

## Configuration

Environment variables needed to run the application:

| Variable                          | Default                        | Description                                                       |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                   | Database backend: `postgresql` or `mariadb`                       |
| `DATABASE_URL`                    | PostgreSQL Compose URL         | Database connection URL; override for the selected provider       |
| `MEDIA_LOCATION`                  | `/app/media`                   | Root directory for file uploads                                   |
| `LOG_LEVEL`                       | `info`                         | Runtime log-stream verbosity: `debug`, `info`, `warn`, `error`    |
| `LOG_FILE`                        | `/app/logs/app.log`            | Log file path inside the container                                |
| `LOG_ROTATE_MAX_BYTES`            | `10485760`                     | Rotate active log file when size reaches this many bytes          |
| `LOG_ROTATE_MAX_FILES`            | `10`                           | Number of rotated log archives to keep (`0` keeps none)           |
| `LOG_ROTATE_COMPRESS`             | `true`                         | Compress rotated logs with gzip (`.gz`) when enabled              |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | Bearer token lifetime in seconds                                  |
| `PORT`                            | `3000`                         | HTTP port                                                         |
| `COGNIS_WEB_TLS_CERTIFICATE`      | `/etc/nginx/tls/fullchain.pem` | Certificate path; readable certificate and key files enable HTTPS |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY`  | `/etc/nginx/tls/privkey.pem`   | Private-key path; readable certificate and key files enable HTTPS |
| `HOST`                            | `cognis`                       | Internal application service hostname                             |
| `EXTERNAL_HOST`                   | `http://localhost`             | Publicly reachable URL for links                                  |
| `CONTACT_EMAIL`                   | `admin@localhost`              | Public support contact                                            |
| `COGNIS_SMTP_HOST`                | —                              | SMTP server hostname; enables the SMTP notification adapter       |
| `COGNIS_UI_DEMO_MODE`             | `0`                            | Set to `1` to enable pre-populated example data                   |

Application defaults are declared in `docker/Dockerfile`; web defaults are declared in `docker/cognis-web/Dockerfile`.
