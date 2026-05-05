# Platform Features

This page gives a broad tour of what Cognis provides today.

## Core capabilities

- **Authentication and identity** via pluggable auth adapters.
- **Modular language content delivery** for scalable self-study and guided instruction.
- **Live collaboration readiness** through open-source communication integrations (including Jitsi-oriented workflows).
- **Configurable UI pages** with reusable layout slots and preference persistence.
- **Lightweight social networking** with public profiles, microblogging, achievements, and direct messaging.
- **API-first architecture** with modular route groups.
- **Documentation browser** built directly into the app.

## Learning modes

- **Independent learners** can work through modular language content at their own pace.
- **Teachers/tutors** can guide sessions and structure activities around reusable modules.
- **Communities** can organize shared study rhythms using social features and messaging.

## Adapter coverage

| Area     | Built-in adapters                 | Notes                     |
| -------- | --------------------------------- | ------------------------- |
| Database | memory, sqlite, postgres, mariadb | swap by environment       |
| Auth     | local, ldap, saml, oidc           | supports enterprise flows |
| Files    | local                             | can be extended           |

## Useful links

- [Core package overview](./core.md)
- [API route docs](./api.md)
- [UI docs](./ui.md)

## Example configuration snippet

Single-line config example: `{"demoMode": true, "theme": "dark"}`.

```json
{
    "demoMode": true,
    "theme": "dark",
    "showDocs": true
}
```
