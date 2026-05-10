# Cognis – Agent Guide

See `.github/copilot-instructions.md` for architecture, code quality, testing, linting, security, i18n, and contribution rules. This file covers Cloud Agent environment specifics only.

## Cursor Cloud specific instructions

### Quick reference

Standard commands from `package.json`:

| Task | Command |
|---|---|
| Install deps | `npm ci` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Start server | `npm run start` |
| CLI | `npm run cli -- <command>` |

Lint and tests require `ripgrep` (see `.github/copilot-instructions.md` prerequisites).

### Running locally (without Docker)

The app defaults to Docker-oriented paths under `/app/`. Override these env vars to avoid permission errors:

```
DB_TYPE=sqlite
SQLITE_PATH=/workspace/.local/data/cognis.sqlite
LOG_FILE=/workspace/.local/logs/app.log
COGNIS_CLI_TOKEN_PATH=/workspace/.local/config/cli-access.token
COGNIS_ACCESS_TOKEN_STORE_PATH=/workspace/.local/config/access-tokens.json
MEDIA_LOCATION=/workspace/.local/media
```

Create the directories first: `mkdir -p /workspace/.local/{config,logs,media,data}`

### Running with Docker Compose (intended deployment pathway)

```bash
docker compose -f docker-compose.dev.yaml build
docker compose -f docker-compose.dev.yaml up -d
```

This starts PostgreSQL 17 + the Cognis app on port 3000. The dev compose bind-mounts the repo into `/app` for live edits.

Docker daemon must be started manually in Cloud Agent VMs (systemd is unavailable):

```bash
sudo dockerd &
```

Requires `fuse-overlayfs`, `iptables-legacy`, and `/etc/docker/daemon.json` with `"storage-driver": "fuse-overlayfs"` plus `"features": {"containerd-snapshotter": false}` (Docker 29+).

### Admin credentials

On first startup the server auto-creates an admin account. The generated password is printed in the server logs:

```
WARN  Default admin account created.
  username: admin
  generatedPassword: <random>
```

### SQLite migration gotcha

The `sqlite3` npm module does not support `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` despite reporting SQLite 3.52.0. The init scripts define the base schema and migration files add columns without that clause. The SQL statement splitter splits on `;`, so trigger bodies with internal semicolons cannot be used in migration files.
