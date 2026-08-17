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
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.18` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.19` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.9`  |
| File Quota            | `src/adapters/file/quota/`          | `1.0.7`  |
| Local Auth            | `src/adapters/auth/local/`          | `0.3.7`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `1.0.35` |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.10` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.7`  |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.7`  |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.19` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.10` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.6`  |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.5`  |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.10` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.8`  |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.9`  |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.8`  |
| Public Registration   | `src/adapters/registration/public/` | `0.1.6`  |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.1.61` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.0.65` |
| Link Share            | `src/adapters/share/link/`          | `1.1.34` |
| User Share            | `src/adapters/share/user/`          | `1.1.19` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.10` |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0`  |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

## Gateways

| Component             | Path                          | Version   |
| --------------------- | ----------------------------- | --------- |
| Database (db)         | `src/gateways/db/`            | `1.3.8`   |
| Authentication (auth) | `src/gateways/auth/`          | `1.9.8`   |
| Share                 | `src/gateways/share/`         | `1.7.26`  |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.1.18`  |
| Notification (notify) | `src/gateways/notify/`        | `1.5.5`   |
| Social                | `src/gateways/social/`        | `1.2.14`  |
| File Storage (files)  | `src/gateways/files/`         | `2.1.6`   |
| Registration          | `src/gateways/registration/`  | `1.1.14`  |
| Logging               | `src/gateways/logging/`       | `1.5.12`  |
| Observability         | `src/gateways/observability/` | `1.0.6`   |
| Study                 | `src/gateways/study/`         | `1.5.11`  |
| Calendar              | `src/gateways/calendar/`      | `1.4.102` |

## Core contracts

| Component    | Path        | Version  |
| ------------ | ----------- | -------- |
| Core Package | `src/core/` | `0.3.16` |

## API

| Component  | Path       | Version  |
| ---------- | ---------- | -------- |
| API Server | `src/api/` | `0.3.12` |

## Tooling

| Component  | Path               | Version |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.2.3` |

## Modules

| Component            | Path                                | Version  |
| -------------------- | ----------------------------------- | -------- |
| Analytics            | `src/modules/analytics/`            | `2.0.9`  |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.4.53` |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.3.19` |
| Cognis Japanese      | `src/modules/study/languages/ja/`   | `1.2.10` |
| Cognis English       | `src/modules/study/languages/en/`   | `1.2.8`  |
