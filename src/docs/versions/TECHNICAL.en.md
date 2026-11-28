# Technical Reference

This index records shipped component versions and explains tested dependency ceilings and documentation-version selection.

## Interfaces

### Core contracts

| Component    | Path        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.6.6` |

### API

| Component  | Path       | Version   |
| ---------- | ---------- | --------- |
| API Server | `src/api/` | `0.13.41` |

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
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.5.6`  |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.40` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.30` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.28` |
| Local Auth            | `src/adapters/auth/local/`          | `0.4.5`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `2.1.9`  |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.41` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.27` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.27` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.1.5`  |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.31` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.30` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.35` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.30` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.27` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.43` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.26` |
| Profile (Social)      | `src/adapters/social/profile/`      | `3.0.23` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.52` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.40` |
| Link Share            | `src/adapters/share/link/`          | `1.1.44` |
| User Share            | `src/adapters/share/user/`          | `1.1.22` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.4.16` |
| Library (Study)       | `src/adapters/study/library/`       | `4.1.33` |
| Drawing (Study)       | `src/adapters/study/drawing/`       | `1.1.5`  |
| Flashcards Adapter    | `src/adapters/study/flashcards/`    | `1.5.37` |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.3.5`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.2.15` |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

### Gateways

| Component             | Path                          | Version  |
| --------------------- | ----------------------------- | -------- |
| Database (db)         | `src/gateways/db/`            | `1.4.4`  |
| Authentication (auth) | `src/gateways/auth/`          | `2.2.12` |
| Share                 | `src/gateways/share/`         | `1.9.15` |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.3.12` |
| Notification (notify) | `src/gateways/notify/`        | `2.2.15` |
| Social                | `src/gateways/social/`        | `1.4.9`  |
| File Storage (files)  | `src/gateways/files/`         | `2.3.10` |
| Registration          | `src/gateways/registration/`  | `1.2.11` |
| Logging               | `src/gateways/logging/`       | `1.5.25` |
| Observability         | `src/gateways/observability/` | `1.0.10` |
| Study                 | `src/gateways/study/`         | `2.6.18` |
| Calendar              | `src/gateways/calendar/`      | `1.7.30` |

### Tooling

| Component  | Path               | Version |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.4.6` |

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
