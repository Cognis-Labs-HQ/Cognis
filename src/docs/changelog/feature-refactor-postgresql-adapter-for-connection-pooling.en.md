# Pooled PostgreSQL Connections

## PostgreSQL now uses a bounded connection pool

Ordinary database operations can run concurrently through `pg.Pool`, while every transaction remains pinned to one client through commit or rollback. Environment settings bound pool size and connection, idle, and optional statement timeouts.

## Server shutdown drains database connections

The PostgreSQL adapter registers pool shutdown through the ctx lifecycle capability, allowing server termination to stop accepting requests and drain the pool cleanly.
