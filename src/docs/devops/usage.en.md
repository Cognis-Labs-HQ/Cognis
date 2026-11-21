# Usage

Practical procedures for DevOps.

## Prerequisites

Prepare Docker Compose and deployment-managed database credentials and encryption key.

## Examples

Supply POSTGRES_PASSWORD and DATA_ENCRYPTION_KEY, run `docker compose up --build`, then check container health and application logs.

```sh
export POSTGRES_PASSWORD='<database password>'
export DATA_ENCRYPTION_KEY='<64-character encryption key>'
docker compose up --build
```

## Expected Results

The application starts behind nginx using the configured database; required missing secrets prevent startup.

## Troubleshooting

Check Compose errors, database connectivity and mounted-directory ownership. Back up database and media together before upgrades.
