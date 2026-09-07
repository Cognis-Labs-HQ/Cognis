# Portable Environment Setup

**Feature Branch:** N/A

## Run without env files

Container orchestrators can now inject configuration entirely through environment variables. A supplied `DATABASE_URL` is used directly, and its supported URL scheme selects the database provider when `DB_TYPE` is absent.

## Deployment-neutral errors

Entrypoint validation now describes missing container environment values without requiring Compose-specific generated files or setup commands.

## Commits
