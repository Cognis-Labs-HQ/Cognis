# Usage

Practical procedures for In-Memory Database.

## Prerequisites

This test double supplies neither persistence nor transaction rollback.

## Examples

Instantiate MemoryDatabaseGateway, run query or execute, then inspect getQueries() for statement and params.

## Expected Results

Query returns empty rows and rowCount zero; execute returns affectedRows zero.

## Troubleshooting

The standard loader cannot select this class through DB_TYPE alone; persistence tests need a real database.
