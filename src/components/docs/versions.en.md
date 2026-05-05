# Component Versions

This document tracks the current version of each gateway, adapter, and module in the Cognis codebase. Any change to the code, schema, or API within a component's scope must be accompanied by a version bump in that component's `package.json`.

## Rule

Every gateway, adapter, and module carries a `package.json` with a `version` field. When you modify a component — including its internal logic, database schema, public API, or configuration format — increment the version following [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): bug fixes, non-breaking internal changes.
- **Minor** (`0.x.0`): new backwards-compatible features or API additions.
- **Major** (`x.0.0`): breaking changes to the component's public API or schema.

## Adapters

| Component           | Path                          | Version |
| ------------------- | ----------------------------- | ------- |
| SMTP Notification   | `src/adapters/notify/smtp/`   | `0.1.0` |
| Local File Storage  | `src/adapters/file-local/`    | `0.1.0` |
| SQLite Database     | `src/adapters/db-sqlite/`     | `0.1.0` |
| PostgreSQL Database | `src/adapters/db-postgres/`   | `0.1.0` |
| MariaDB Database    | `src/adapters/db-mariadb/`    | `0.1.0` |
| In-Memory Database  | `src/adapters/db-memory/`     | `0.1.0` |
| LDAP Auth           | `src/adapters/auth-ldap/`     | `0.1.0` |
| SAML Auth           | `src/adapters/auth-saml/`     | `0.1.0` |
| OIDC SSO Auth       | `src/adapters/auth-sso-oidc/` | `0.1.0` |

## Gateways

| Component             | Path                        | Version |
| --------------------- | --------------------------- | ------- |
| Notification (notify) | `src/api/gateways/notify/`  | `0.1.0` |
| Profile               | `src/api/gateways/profile/` | `0.1.0` |
| File Storage          | `src/api/gateways/files/`   | `0.1.0` |
| Logging               | `src/api/gateways/logging/` | `0.1.0` |

## Core contracts

| Component    | Path        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.1.0` |

## API

| Component  | Path       | Version |
| ---------- | ---------- | ------- |
| API Server | `src/api/` | `0.1.0` |

## Modules

| Component        | Path                            | Version |
| ---------------- | ------------------------------- | ------- |
| Sample Analytics | `src/modules/sample-analytics/` | `0.1.0` |
