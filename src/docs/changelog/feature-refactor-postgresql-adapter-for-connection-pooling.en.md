# Pooled PostgreSQL Connections

## PostgreSQL now uses a bounded connection pool

Ordinary database operations can run concurrently through `pg.Pool`, while every transaction remains pinned to one client through commit or rollback. Environment settings bound pool size and connection, idle, and optional statement timeouts.

## Server shutdown drains database connections

The PostgreSQL adapter registers pool shutdown through the ctx lifecycle capability, allowing server termination to stop accepting requests and drain the pool cleanly.

## Docker setups now use explicit environment profiles

Shared, PostgreSQL, development, and production env files now carry container defaults. Compose selects the appropriate profiles without interpolating unset pool variables, eliminating blank-variable warnings.

## MariaDB now uses equivalent connection pooling

The MariaDB adapter now uses a bounded `mysql2` pool for concurrent queries, pins transactions to one connection, drains during lifecycle shutdown, and supports bounded maximum-size, idle-timeout, and connection-timeout settings.

## Docker profiles now select the database driver

PostgreSQL and MariaDB now have separate production and development Compose and env files. Administration marks only the configured database adapter active, locks every driver toggle, and explains Docker ownership in the database gateway heading.

## Production containers require secrets before startup

The PostgreSQL and MariaDB container entrypoint now rejects missing database settings and data-encryption keys immediately, identifying the env file that needs each value.

## Environment profiles replace the obsolete example

The obsolete root environment example has been removed. The selected files under `docker/env/` and the translated DevOps guide now provide the complete setup reference.

## The container constructs database connection URLs

Every database profile supplies its engine-specific host, port, database, username, and password values to the container entrypoint, which validates them and constructs `DATABASE_URL` without relying on Compose interpolation. The root `.env` links to the shared default profile, while the default Compose link selects the best-supported PostgreSQL deployment.

## Driver defaults are isolated by engine

PostgreSQL and MariaDB host, port, database, username, and pool defaults now live exclusively in their respective driver env profiles. The shared default profile contains only engine-neutral application settings.

## User-managed secret files stay untracked

Production secret env files are now ignored by Git and have tracked `.example` templates. Entrypoint validation errors identify the exact profile file where each missing value must be set.

## Docker repository paths are relative

Repository-owned Docker runtime paths now resolve relative to the image worktree. Absolute paths remain only where Docker requires container mount targets or system-installed command locations.
