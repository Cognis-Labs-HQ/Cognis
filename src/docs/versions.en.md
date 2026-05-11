# Component Versions

## Overview

This document tracks the current version of every gateway, adapter, and module in the Cognis codebase. It serves as a changelog index and a quick reference for determining whether a component has been updated since a previous release.

Every gateway, adapter, and module carries a `package.json` with a `version` field. When you modify a component — including its internal logic, database schema, public API, or configuration format — you must increment the version in that `package.json` following Semantic Versioning. This document is updated at the same time.

## Responsibilities

- Record the current version of every versioned component in the codebase.
- Serve as the changelog index: link to per-component docs and CHANGELOG.md for history.
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
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.1.0` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.0` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.0` |
| Local Auth            | `src/adapters/auth/local/`          | `0.2.2` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.1.0` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.1.0` |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.1` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.1` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.0` |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.0.0` |
| Messages (Social)     | `src/adapters/social/messages/`     | `1.0.0` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.0.0` |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0` |

## Gateways

| Component             | Path                         | Version |
| --------------------- | ---------------------------- | ------- |
| Database (db)         | `src/gateways/db/`           | `1.1.2` |
| Authentication (auth) | `src/gateways/auth/`         | `1.3.2` |
| Notification (notify) | `src/gateways/notify/`       | `1.3.0` |
| Social                | `src/gateways/social/`       | `1.2.0` |
| File Storage (files)  | `src/gateways/files/`        | `1.1.0` |
| Registration          | `src/gateways/registration/` | `1.1.2` |
| Logging               | `src/gateways/logging/`      | `1.4.0` |
| Study                 | `src/gateways/study/`        | `1.1.0` |

## Core contracts

| Component    | Path        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.1.0` |

## API

| Component  | Path       | Version |
| ---------- | ---------- | ------- |
| API Server | `src/api/` | `0.1.3` |

## Modules

| Component                 | Path                              | Version |
| ------------------------- | --------------------------------- | ------- |
| Sample Analytics          | `src/modules/sample-analytics/`   | `0.1.0` |
| Japanese Language (Study) | `src/modules/study/languages/ja/` | `1.0.0` |
