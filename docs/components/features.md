# Platform Features

This page gives a broad tour of what Cognis provides today.

## Core capabilities

- **Authentication and identity** via pluggable auth adapters.
- **Configurable UI pages** with reusable layout slots.
- **Widget-based page composition** for customizable dashboards.
- **API-first architecture** with modular route groups.
- **Documentation browser** built directly into the app.

## Adapter coverage

| Area | Built-in adapters | Notes |
| --- | --- | --- |
| Database | memory, sqlite, postgres, mariadb | swap by environment |
| Auth | local, ldap, saml, oidc | supports enterprise flows |
| Files | local | can be extended |

## Useful links

- [Core package overview](https://github.com/)
- [API route docs](https://github.com/)

## Example configuration snippet

Single-line config example: `{"demoMode": true, "theme": "dark"}`.

```json
{
  "demoMode": true,
  "theme": "dark",
  "showDocs": true
}
```
