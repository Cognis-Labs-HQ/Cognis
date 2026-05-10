# Platform Features

## Overview

Cognis is a self-hosted language-study platform that combines structured learning content with social features, pluggable authentication, flexible persistence, and a real-time collaboration readiness layer. This document describes the capabilities available out of the box and the adapter coverage for each area.

## Core capabilities

- **Authentication and identity** — pluggable auth adapters support local credentials, LDAP directory services, SAML 2.0, and OAuth2/OIDC providers such as Google or Microsoft. All providers are managed through the auth gateway's admin API without code changes.
- **Modular language content delivery** — the module system allows curriculum units, activity types, and integrations to be packaged as modules and installed at runtime. Core modules are always present; optional modules can be enabled or disabled by an admin.
- **Live collaboration readiness** — the platform is designed to integrate open-source communication tooling such as Jitsi for real-time study sessions.
- **Configurable UI pages** — every page uses `createPageComposer` for reusable layout slots and per-user preference persistence. Users can customise widget placement on their profile and study pages.
- **Lightweight social networking** — public profiles, microblog-style posts with per-post visibility, follower/following graphs, and block management.
- **API-first architecture** — every feature is accessible via a versioned HTTP API with stable `{ data }` / `{ error }` response envelopes.
- **Documentation browser** — docs are served directly from the running application at `/docs`, auto-discovered from `docs/` directories across the codebase.

## Learning modes

- **Independent learners** work through modular language content at their own pace using the self-study surface.
- **Teachers and tutors** guide sessions and structure activities around reusable modules. The `teacher` role unlocks instructor-specific API access.
- **Communities** organise shared study rhythms using social features, posts, and the follow graph.

## Adapter coverage

| Area          | Built-in adapters                         | Notes                                                           |
| ------------- | ----------------------------------------- | --------------------------------------------------------------- |
| Database      | `memory`, `mariadb`, `postgres`            | Swap by setting `DB_TYPE`; no code changes needed               |
| Auth          | `local`, `ldap`, `saml`, `oidc`           | Multiple providers can be enabled simultaneously                |
| File storage  | `local`                                   | Stores uploads on the container filesystem; mounted as a volume |
| Notifications | `smtp`                                    | Activated by setting `COGNIS_SMTP_HOST`                         |

## Notification features

When the SMTP adapter is configured, Cognis can send:

- Two-factor authentication (TFA) codes.
- Email verification links for new accounts.
- System notifications dispatched via `POST /api/v1/notifications/send` (admin).

Notification delivery respects per-user channel preferences stored in the database.

## Admin capabilities

Admins have access to:

- Full gateway management (enable/disable gateways, configure auth adapters).
- Module installation and lifecycle management.
- Per-category file size limits (`image`, `video`, `text`, `global`).
- System health and diagnostics endpoints.
- Deletion of any file or post on the platform.
