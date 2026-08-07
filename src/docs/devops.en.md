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

### Environment profiles

Docker defaults remain in the tracked `docker/env/default.env`. Run `./setup.sh` to choose PostgreSQL or MariaDB, select development or production, and enter the connection settings. The script writes application and database values to the ignored `docker/env/runtime.env`, writes only web TLS settings to `docker/env/cognis-web.env`, generates secrets when values are left blank, and updates `docker-compose.yaml` to select the chosen driver. Compose gives `cognis-web` only the web file, so it cannot read Cognis encryption keys or database credentials. The application entrypoint validates its generated settings and constructs `DATABASE_URL`. The setup also requires the internal `HOST`, public `EXTERNAL_HOST`, and public `CONTACT_EMAIL`; the application container validates all three. The setup asks whether a separate reverse proxy or CDN terminates HTTPS before `cognis-web`; answering yes writes `COGNIS_WEB_TLS_MODE=deferred`, while no keeps local TLS termination with `terminate`.

Env files are a convenience for Compose, not a runtime requirement. Orchestrators such as Kubernetes may inject the same values directly into the container. They may either provide `DB_TYPE` and the provider-specific connection variables, or provide `DATABASE_URL` directly; when `DB_TYPE` is omitted, the entrypoint derives it from a PostgreSQL or MySQL/MariaDB URL scheme.

```sh
./setup.sh
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

| Variable                          | Default                        | Description                                                                                      |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `DB_TYPE`                         | `postgresql`                   | Database backend: `postgresql` or `mariadb`                                                      |
| `DATABASE_URL`                    | —                              | Constructed by the container entrypoint from engine settings                                     |
| `MEDIA_LOCATION`                  | `/app/media`                   | Root directory for file uploads                                                                  |
| `LOG_LEVEL`                       | `info`                         | Runtime log-stream verbosity: `debug`, `info`, `warn`, `error`                                   |
| `LOG_FILE`                        | `/app/logs/app.log`            | Log file path inside the container                                                               |
| `LOG_ROTATE_MAX_BYTES`            | `10485760`                     | Rotate active log file when size reaches this many bytes                                         |
| `LOG_ROTATE_MAX_FILES`            | `10`                           | Number of rotated log archives to keep (`0` keeps none)                                          |
| `LOG_ROTATE_COMPRESS`             | `true`                         | Compress rotated logs with gzip (`.gz`) when enabled                                             |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | Bearer token lifetime in seconds                                                                 |
| `PORT`                            | `3000`                         | HTTP port                                                                                        |
| `COGNIS_WEB_TLS_MODE`             | `terminate`                    | Web TLS mode: `terminate` for local HTTPS or `deferred` for HTTP behind a trusted TLS terminator |
| `COGNIS_WEB_TLS_CERTIFICATE`      | `/etc/nginx/tls/fullchain.pem` | Certificate path inside `cognis-web`; read only in `terminate` mode                              |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY`  | `/etc/nginx/tls/privkey.pem`   | Private-key path inside `cognis-web`; read only in `terminate` mode                              |
| `HOST`                            | —                              | Required internal service hostname                                                               |
| `EXTERNAL_HOST`                   | —                              | Required publicly reachable URL for links                                                        |
| `CONTACT_EMAIL`                   | —                              | Required public support contact                                                                  |
| `COGNIS_SMTP_HOST`                | —                              | SMTP server hostname; enables the SMTP notification adapter                                      |
| `COGNIS_UI_DEMO_MODE`             | `0`                            | Set to `1` to enable pre-populated example data                                                  |

The active Docker defaults and setup overrides are listed directly in the env files under `docker/env/`.
