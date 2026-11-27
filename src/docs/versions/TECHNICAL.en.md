# Technical Reference

This index records shipped component versions and explains tested dependency ceilings and documentation-version selection.

## Interfaces

### Core contracts

| Component    | Path        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.6.4` |

### API

| Component  | Path       | Version   |
| ---------- | ---------- | --------- |
| API Server | `src/api/` | `0.13.39` |

## Configuration

Manifests and package.json carry component versions. Cognis dependencies use tested ceilings such as <=1.2.3; this is a compatibility warning boundary, not a claim that every older feature is equivalent.

## Behavior

### Overview

This document tracks the current version of every gateway, adapter, and module in the Cognis codebase. It serves as a changelog index and a quick reference for determining whether a component has been updated since a previous release.

Components declare a `version` in `manifest.json`, `package.json`, or both; when both exist, keep them synchronized. Increment the owning component version when its implementation, database schema, public API or configuration format changes, following Semantic Versioning. Update this index at the same time. Release notes belong to the single localized branch changelog set under `src/docs/changelog/`.

### Responsibilities

- Record the current version of every versioned component in the codebase.
- Serve as the changelog index: link to per-component docs and `src/docs/changelog/` for history.
- Make it straightforward to detect version drift between deployed components and the current codebase.

Not responsible for: enforcing version bumps (that is a code review concern) or tracking dependency versions of external packages.

### Dependency rule

Internal Cognis component dependencies use `<=<tested-version>` ranges. This records the latest dependency version the component was tested against while allowing the administration lifecycle view to warn when a newer installed dependency may be unverified.

### Adapters

| Component             | Path                                | Version  |
| --------------------- | ----------------------------------- | -------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.5.4`  |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.38` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.28` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.26` |
| Local Auth            | `src/adapters/auth/local/`          | `0.4.3`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `2.1.7`  |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.39` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.25` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.25` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.1.3`  |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.29` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.28` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.33` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.28` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.25` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.41` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.24` |
| Profile (Social)      | `src/adapters/social/profile/`      | `3.0.21` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.50` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.38` |
| Link Share            | `src/adapters/share/link/`          | `1.1.42` |
| User Share            | `src/adapters/share/user/`          | `1.1.20` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.4.14` |
| Library (Study)       | `src/adapters/study/library/`       | `4.1.31` |
| Drawing (Study)       | `src/adapters/study/drawing/`       | `1.1.3`  |
| Flashcards Adapter    | `src/adapters/study/flashcards/`    | `1.5.35` |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.3.3`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.2.13` |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

### Gateways

| Component             | Path                          | Version  |
| --------------------- | ----------------------------- | -------- |
| Database (db)         | `src/gateways/db/`            | `1.4.2`  |
| Authentication (auth) | `src/gateways/auth/`          | `2.2.10` |
| Share                 | `src/gateways/share/`         | `1.9.13` |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.3.10` |
| Notification (notify) | `src/gateways/notify/`        | `2.2.13` |
| Social                | `src/gateways/social/`        | `1.4.7`  |
| File Storage (files)  | `src/gateways/files/`         | `2.3.8`  |
| Registration          | `src/gateways/registration/`  | `1.2.9`  |
| Logging               | `src/gateways/logging/`       | `1.5.23` |
| Observability         | `src/gateways/observability/` | `1.0.8`  |
| Study                 | `src/gateways/study/`         | `2.6.16` |
| Calendar              | `src/gateways/calendar/`      | `1.7.28` |

### Tooling

| Component  | Path               | Version |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.4.4` |

[c]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/package.json
[a]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/package.json
[m]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/messages/package.json
[p]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/package.json

## Security

An installed version or tested ceiling is not authorization to enable a component. Package integrity, dependencies and required-host protections still apply during upgrades.

## Reference

### Versioning rule

Increment using [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): bug fixes, non-breaking internal changes.
- **Minor** (`0.x.0`): new backwards-compatible features or API additions.
- **Major** (`x.0.0`): breaking changes to the component's public API or schema.
