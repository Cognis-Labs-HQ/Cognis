# Deployment and database pool follow-up fixes

## Preserve release asset versions

Docker images now retain the build-provided asset version so upgraded deployments invalidate cached static resources.

## Safely construct database URLs

The container entrypoint percent-encodes PostgreSQL and MariaDB credentials before placing them in connection URLs.

## Keep database components isolated and versioned

Pool setting validation now belongs to each database adapter, and the adapter and gateway workspace versions and dependency ceilings are synchronized.
