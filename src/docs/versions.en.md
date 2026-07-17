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

## Adapters

| Component             | Path                                | Version |
| --------------------- | ----------------------------------- | ------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.2` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.6` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.1` |
| Local Auth            | `src/adapters/auth/local/`          | `0.2.5` |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.1.4` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.1` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.1` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.1` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.4` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.4.1` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.4.1` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.1` |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.2` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.1` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.0` |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.1.1` |
| Messages (Social)     | `src/adapters/social/messages/`     | `1.4.7` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.3` |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0` |

## Gateways

| Component             | Path                         | Version  |
| --------------------- | ---------------------------- | -------- |
| Database (db)         | `src/gateways/db/`           | `1.2.2`  |
| Authentication (auth) | `src/gateways/auth/`         | `1.5.0`  |
| Share                 | `src/gateways/share/`        | `1.3.0`  |
| Two-Factor (tfa)      | `src/gateways/tfa/`          | `1.1.2`  |
| Notification (notify) | `src/gateways/notify/`       | `1.4.9`  |
| Social                | `src/gateways/social/`       | `1.2.7`  |
| File Storage (files)  | `src/gateways/files/`        | `2.1.0`  |
| Registration          | `src/gateways/registration/` | `1.1.10` |
| Logging               | `src/gateways/logging/`      | `1.5.2`  |
| Study                 | `src/gateways/study/`        | `1.5.7`  |
| Calendar              | `src/gateways/calendar/`     | `1.2.0`  |

## Core contracts

| Component    | Path        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.3.0` |

## API

| Component  | Path       | Version |
| ---------- | ---------- | ------- |
| API Server | `src/api/` | `0.1.9` |

## Modules

| Component            | Path                                | Version  |
| -------------------- | ----------------------------------- | -------- |
| Analytics            | `src/modules/analytics/`            | `2.0.1`  |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.2.4`  |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.1.30` |
| Cognis Japanese      | `src/modules/study/languages/ja/`   | `1.2.4`  |
| Cognis English       | `src/modules/study/languages/en/`   | `1.2.2`  |
