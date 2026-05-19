# Cognis Documentation Index

## Overview

This is the root navigation document for the Cognis developer documentation. All docs in this set are served through the in-app documentation browser at `/docs` and via `GET /api/v1/docs`. Each document is a Markdown file auto-discovered from `docs/` directories across the codebase.

These docs are written for developer contributors, not end users. They describe the architecture, design decisions, and operational details of each component. If you are new to the codebase, start with the Overview and Platform Features docs, then read the Core and API docs before diving into individual gateways and adapters.

## Table of contents

### Platform

| Doc                                      | Description                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| [Overview](/docs/overview)               | What Cognis is, its architecture philosophy, and how the layers fit together |
| [Platform Features](/docs/features)      | Tour of built-in capabilities, learning modes, and adapter coverage          |
| [Documentation Standard](/docs/standard) | How documentation is written and organised in this codebase                  |
| [ACL Matrix](/docs/acl-matrix)           | Role definitions and the full permission matrix                              |
| [Component Versions](/docs/versions)     | Current version of every gateway, adapter, and module                        |
| [Changelog](/changelogs)                 | Per-PR changelog entries                                                     |

### Architecture layers

| Doc                        | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| [Core](/docs/core)         | Contracts, interfaces, and policy services; the foundation layer          |
| [API](/docs/api)           | HTTP server, route groups, auth model, and response envelopes             |
| [UI](/docs/ui)             | Browser frontend: pages, layouts, i18n, theme requirements                |
| [Gateways](/docs/gateways) | How to create gateways and adapters; boot order; capability store         |
| [Adapters](/docs/adapters) | Platform-level overview of the adapters layer and all adapter types       |
| [DevOps](/docs/devops)     | Dockerfile, GitHub Actions, GitLab CI, and environment variable reference |

### Features

| Doc                                      | Description                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [Profile](/docs/adapters/social/profile) | User profiles, social graph, posts, file uploads, and visibility model |
| [Page Composer](/docs/page-composer)     | The `createPageComposer` grid layout and persistence utility           |

### Gateways

| Doc                                              | Description                                                 |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [Auth Gateway](/docs/gateways/auth)              | Authentication providers, adapter discovery, token issuance |
| [Database Gateway](/docs/gateways/db)            | Single database access point, executor, dialect helper      |
| [Files Gateway](/docs/gateways/files)            | Local file storage capabilities                             |
| [Logging Gateway](/docs/gateways/logging)        | Structured logging to stdout/stderr and file                |
| [Notify Gateway](/docs/gateways/notify)          | Pluggable notification dispatch, TFA, email verification    |
| [Social Gateway](/docs/gateways/social/standard) | Profiles, social graph, posts, messaging, and preferences   |

### Adapters

| Doc                                          | Description                                       |
| -------------------------------------------- | ------------------------------------------------- |
| [Auth: Local](/docs/adapters/auth/local)     | Built-in credential store with scrypt hashing     |
| [Auth: LDAP](/docs/adapters/auth/ldap)       | Directory-based enterprise authentication         |
| [Auth: OIDC](/docs/adapters/auth/oidc)       | OAuth2/OIDC SSO for Google, Microsoft, and others |
| [Auth: SAML](/docs/adapters/auth/saml)       | SAML 2.0 assertion-based SSO                      |
| [DB: PostgreSQL](/docs/adapters/db/postgres) | Default production-grade relational database      |
| [DB: MariaDB](/docs/adapters/db/mariadb)     | Production-grade relational database              |
| [DB: Memory](/docs/adapters/db/memory)       | In-memory adapter for tests and isolated CI       |
| [File: Local](/docs/adapters/file/local)     | Filesystem-backed file storage adapter            |
| [Notify: SMTP](/docs/adapters/notify/smtp)   | Email delivery via SMTP                           |

### Modules

| Doc                               | Description                                         |
| --------------------------------- | --------------------------------------------------- |
| [Module Framework](/docs/modules) | How modules are discovered, enabled, and integrated |

### Tooling

| Doc                      | Description                                       |
| ------------------------ | ------------------------------------------------- |
| [Tooling](/docs/tooling) | Linting, readability checks, CLI, and test runner |
