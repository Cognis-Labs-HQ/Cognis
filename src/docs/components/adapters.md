# Adapters Component

## Purpose
`adapters/` contains provider-specific implementations for core gateway interfaces.

## Database adapters
- `db-memory`: reference/testing adapter.
- `db-mariadb`: MariaDB gateway implementation plus auth-account schema bootstrap helper (`ensureMariaDbAuthSchema`).
- `db-postgres`: PostgreSQL gateway implementation plus auth-account schema bootstrap helper (`ensurePostgresAuthSchema`).
- `db-sqlite`: SQLite gateway implementation plus auth-account schema bootstrap helper (`ensureSqliteAuthSchema`).

## File adapter
- `file-local`: path-based local filesystem implementation.

## Auth adapters
- `auth-ldap`: LDAP token/authentication adapter with group-to-admin mapping and optional local break-glass admin creation.
- `auth-saml`: SAML assertion adapter with configurable admin claim mapping.
- `auth-sso-oidc`: OAuth/OIDC SSO adapter for providers such as Google or Microsoft, with role-to-admin mapping and first-login account provisioning.

## Rules
- Adapters may use provider-specific semantics internally.
- Public behavior must conform to core gateway contracts.
