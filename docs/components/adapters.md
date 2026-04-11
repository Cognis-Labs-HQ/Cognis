# Adapters Component

## Purpose
`adapters/` contains provider-specific implementations for core gateway interfaces.

## Database adapters
- `db-memory`: reference/testing adapter.
- `db-mariadb`: MariaDB gateway implementation.
- `db-postgres`: PostgreSQL gateway implementation.
- `db-sqlite`: SQLite gateway implementation.

## File adapter
- `file-local`: path-based local filesystem implementation.

## Rules
- Adapters may use provider-specific semantics internally.
- Public behavior must conform to core gateway contracts.
