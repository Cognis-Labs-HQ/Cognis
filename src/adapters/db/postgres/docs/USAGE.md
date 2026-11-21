# Usage

Practical procedures for PostgreSQL.

## Prerequisites

Prepare a PostgreSQL database accessible to the application.

## Examples

Set DB_TYPE=postgresql and DATABASE_URL, restart and verify schema initialization before accepting users.

## Expected Results

The application uses the PostgreSQL connection pool; transactions commit together or roll back on failure.

## Troubleshooting

Check connection limits, credentials and database privileges. Switching providers does not copy existing data.
