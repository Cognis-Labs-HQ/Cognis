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

The PostgreSQL and MariaDB production Compose profiles now reject missing database passwords, connection URLs, and data-encryption keys before any container is created.

## Environment profiles replace the obsolete example

The obsolete root environment example has been removed. The selected files under `docker/env/` and the translated DevOps guide now provide the complete setup reference.
