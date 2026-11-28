# Usage

Practical procedures for SQLite.

## Prerequisites

An embedding runtime must supply the SQLite client; standard deployment does not wire this class as a selectable database provider.

## Examples

Supply a SqliteClient implementing all, run and exec, then use SqliteDatabaseGateway for a query and transaction in your runtime.

## Expected Results

Queries return rows; successful transaction callbacks commit and thrown failures trigger rollback.

## Troubleshooting

Setting DB_TYPE alone does not wire SQLite into the standard server. Check client integration and file access in your host runtime.
