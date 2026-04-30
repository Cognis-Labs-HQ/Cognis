# Cognis Overview

Cognis is a modular platform for building and running configurable dashboard-style web experiences.

## What it includes

- **API layer** for auth, preferences, docs, and system routes.
- **Core domain services** that define contracts and behavior.
- **Adapters** for storage/auth integrations (memory, sqlite, postgres, mariadb, ldap, saml, oidc, etc).
- **UI app** with page builder and docs experiences.

## Key concepts

- **Page layouts** are rendered through a shared dashboard layout.
- **Toolbar** is optional and appears only when a page provides one.
- **Page context** appears in the top bar for concise page-specific context.
- **Widgets** can be configured per page and persisted as user preferences.

## Typical local workflow

1. Start services locally.
2. Open the dashboard UI.
3. Configure page layouts/widgets.
4. Use docs to explore architecture and module responsibilities.
