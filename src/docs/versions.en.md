<!-- Keep src/docs/versions.de.md, versions.id.md, and versions.ja.md in sync when updating this file. -->

# Component Versions

## Overview

This document tracks the current version of every gateway, adapter, and module in the Cognis codebase. It serves as a changelog index and a quick reference for determining whether a component has been updated since a previous release.

Every gateway, adapter, and module carries a `package.json` with a `version` field. When you modify a component — including its internal logic, database schema, public API, or configuration format — you must increment the version in that `package.json` following Semantic Versioning. This document is updated at the same time. Changelog entries are stored as per-PR files under `src/docs/changelog/`.

## Responsibilities

- Record the current version of every versioned component in the codebase.
- Serve as the changelog index: link to per-component docs and `src/docs/changelog/` for history.
- Make it straightforward to detect version drift between deployed components and the current codebase.

Not responsible for: enforcing version bumps (that is a code review concern) or tracking dependency versions of external packages.

## Versioning rule

Increment using [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): bug fixes, non-breaking internal changes.
- **Minor** (`0.x.0`): new backwards-compatible features or API additions.
- **Major** (`x.0.0`): breaking changes to the component's public API or schema.

## Dependency rule

Internal Cognis component dependencies use `<=<tested-version>` ranges. This records the latest dependency version the component was tested against while allowing the administration lifecycle view to warn when a newer installed dependency may be unverified.

## Adapters

| Component             | Path                                | Version  |
| --------------------- | ----------------------------------- | -------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.5.2`  |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.33` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.26` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.24` |
| Local Auth            | `src/adapters/auth/local/`          | `0.4.1`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `2.1.3`  |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.37` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.24` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.24` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.1.1`  |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.28` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.26` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.31` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.27` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.24` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.40` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.23` |
| Profile (Social)      | `src/adapters/social/profile/`      | `3.0.14` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.38` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.36` |
| Link Share            | `src/adapters/share/link/`          | `1.1.38` |
| User Share            | `src/adapters/share/user/`          | `1.1.20` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.4.11` |
| Library (Study)       | `src/adapters/study/library/`       | `4.1.24` |
| Drawing (Study)       | `src/adapters/study/drawing/`       | `1.1.3`  |
| Flashcards Adapter    | `src/adapters/study/flashcards/`    | `1.5.31` |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.3.1`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.2.11` |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

## Gateways

| Component             | Path                          | Version  |
| --------------------- | ----------------------------- | -------- |
| Database (db)         | `src/gateways/db/`            | `1.4.0`  |
| Authentication (auth) | `src/gateways/auth/`          | `2.2.4`  |
| Share                 | `src/gateways/share/`         | `1.9.7`  |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.3.6`  |
| Notification (notify) | `src/gateways/notify/`        | `2.2.9`  |
| Social                | `src/gateways/social/`        | `1.4.5`  |
| File Storage (files)  | `src/gateways/files/`         | `2.3.6`  |
| Registration          | `src/gateways/registration/`  | `1.2.6`  |
| Logging               | `src/gateways/logging/`       | `1.5.19` |
| Observability         | `src/gateways/observability/` | `1.0.7`  |
| Study                 | `src/gateways/study/`         | `2.6.9`  |
| Calendar              | `src/gateways/calendar/`      | `1.7.6`  |

## Core contracts

| Component    | Path        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.6.2` |

## API

| Component  | Path       | Version   |
| ---------- | ---------- | --------- |
| API Server | `src/api/` | `0.13.28` |

## Tooling

| Component  | Path               | Version |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.4.1` |

[c]: https://github.com/Cognis-Labs-HQ/Cognis/blob/master/src/core/package.json
[a]: https://github.com/Cognis-Labs-HQ/Cognis/blob/master/src/api/package.json
[m]: https://github.com/Cognis-Labs-HQ/Cognis/blob/master/src/adapters/social/messages/package.json
[p]: https://github.com/Cognis-Labs-HQ/Cognis/blob/master/src/adapters/social/profile/package.json
