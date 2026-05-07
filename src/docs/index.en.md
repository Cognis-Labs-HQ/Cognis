# Cognis Documentation Index

## Overview

This is the root navigation document for the Cognis developer documentation. All docs in this set are served through the in-app documentation browser at `/docs` and via `GET /api/v1/docs`. Each document is a Markdown file auto-discovered from `docs/` directories across the codebase.

These docs are written for developer contributors, not end users. They describe the architecture, design decisions, and operational details of each component. If you are new to the codebase, start with the Overview and Platform Features docs, then read the Core and API docs before diving into individual gateways and adapters.

## Table of contents

### Platform

| Doc                                        | Description                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| [Overview](./overview.en.md)               | What Cognis is, its architecture philosophy, and how the layers fit together |
| [Platform Features](./features.en.md)      | Tour of built-in capabilities, learning modes, and adapter coverage          |
| [Documentation Standard](./standard.en.md) | How documentation is written and organised in this codebase                  |
| [ACL Matrix](./acl-matrix.en.md)           | Role definitions and the full permission matrix                              |
| [Component Versions](./versions.en.md)     | Current version of every gateway, adapter, and module                        |

### Architecture layers

| Doc                          | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| [Core](./core.en.md)         | Contracts, interfaces, and policy services; the foundation layer          |
| [API](./api.en.md)           | HTTP server, route groups, auth model, and response envelopes             |
| [UI](./ui.en.md)             | Browser frontend: pages, layouts, i18n, theme requirements                |
| [Adapters](./adapters.en.md) | Platform-level overview of the adapters layer and all adapter types       |
| [DevOps](./devops.en.md)     | Dockerfile, GitHub Actions, GitLab CI, and environment variable reference |

### Features

| Doc                                    | Description                                                            |
| -------------------------------------- | ---------------------------------------------------------------------- |
| [Profile](./profile.en.md)             | User profiles, social graph, posts, file uploads, and visibility model |
| [Page Composer](./page-composer.en.md) | The `createPageComposer` grid layout and persistence utility           |

### Gateways

| Doc                                                     | Description                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| [Auth Gateway](../gateways/auth/docs/index.en.md)       | Authentication providers, adapter discovery, token issuance |
| [Database Gateway](../gateways/db/docs/index.en.md)     | Single database access point, executor, dialect helper      |
| [Files Gateway](../gateways/files/docs/index.en.md)     | Local file storage capabilities                             |
| [Logging Gateway](../gateways/logging/docs/index.en.md) | Structured logging to stdout/stderr and file                |
| [Notify Gateway](../gateways/notify/docs/index.en.md)   | Pluggable notification dispatch, TFA, email verification    |
| [Profile Gateway](../gateways/profile/docs/index.en.md) | Profiles, social graph, posts, and file management          |

### Adapters

| Doc                                                        | Description                                           |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [Auth: Local](../adapters/auth/local/docs/index.en.md)     | Built-in credential store with scrypt hashing         |
| [Auth: LDAP](../adapters/auth/ldap/docs/index.en.md)       | Directory-based enterprise authentication             |
| [Auth: OIDC](../adapters/auth/oidc/docs/index.en.md)       | OAuth2/OIDC SSO for Google, Microsoft, and others     |
| [Auth: SAML](../adapters/auth/saml/docs/index.en.md)       | SAML 2.0 assertion-based SSO                          |
| [DB: SQLite](../adapters/db/sqlite/docs/index.en.md)       | Default embedded database; no external service needed |
| [DB: MariaDB](../adapters/db/mariadb/docs/index.en.md)     | Production-grade relational database                  |
| [DB: PostgreSQL](../adapters/db/postgres/docs/index.en.md) | Robust open-source relational database                |
| [DB: Memory](../adapters/db/memory/docs/index.en.md)       | In-memory adapter for tests and isolated CI           |
| [File: Local](../adapters/file/local/docs/index.en.md)     | Filesystem-backed file storage adapter                |
| [Notify: SMTP](../adapters/notify/smtp/docs/index.en.md)   | Email delivery via SMTP                               |

### Modules

| Doc                                             | Description                                         |
| ----------------------------------------------- | --------------------------------------------------- |
| [Module Framework](../modules/docs/index.en.md) | How modules are discovered, enabled, and integrated |

### Tooling

| Doc                                    | Description                                       |
| -------------------------------------- | ------------------------------------------------- |
| [Tooling](../tooling/docs/index.en.md) | Linting, readability checks, CLI, and test runner |
