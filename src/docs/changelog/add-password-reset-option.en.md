# Auth Password Reset

## Summary

Added a provider-aware password reset flow in User Settings → Security, including server routes that evaluate reset support from the authenticated provider and execute adapter-owned reset logic.

Removed the Authentication admin section registration so authentication provider controls are managed through adapter configuration surfaces instead of a dedicated Administration page section.

Matured auth adapters by adding password-reset capability contracts and LDAP opt-in writeback settings in the adapter config schema.

Fixed the Settings Security runtime rendering error by wiring the section to the Settings page root context, and fixed missing auth security strings by extending settings section i18n with component string bundles.

Removed the Authentication Provider message from the Security settings panel and added a password-change capability route that now drives a warning toast when the active auth provider cannot change passwords.

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts` (settings section registration, password reset/change capability routes, token provider wiring)
- `src/gateways/auth/gateway.ts` (adapter reset support contracts and reset orchestration)
- `src/gateways/auth/access-tokens.ts`, `src/gateways/auth/guard.ts` (provider-bound token claims)
- `src/gateways/auth/ui/security-prefs.js` and `src/gateways/auth/ui/languages/*/strings.xml` (security UI cleanup and unsupported-provider toast behavior)
- `src/adapters/auth/local/*`, `src/adapters/auth/ldap/*`, `src/adapters/auth/oidc/*`, `src/adapters/auth/saml/*` (adapter maturity and capabilities)
- `src/gateways/auth/tests/*` and `src/adapters/auth/*/tests/*` (coverage updates)
- Version manifests and `src/docs/versions.*.md`
- `src/ui/app/settings/index.js` (settings-section i18n extension for component strings)

## Commit Links

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a33f0faa
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9490a011
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8ba1d8b2
