# Auth Password Reset

## Summary

Added a provider-aware password reset flow in User Settings → Security, including server routes that evaluate reset support from the authenticated provider and execute adapter-owned reset logic.

Removed the Authentication admin section registration so authentication provider controls are managed through adapter configuration surfaces instead of a dedicated Administration page section.

Matured auth adapters by adding password-reset capability contracts and LDAP opt-in writeback settings in the adapter config schema.

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts` (settings section registration, password reset routes, token provider wiring)
- `src/gateways/auth/gateway.ts` (adapter reset support contracts and reset orchestration)
- `src/gateways/auth/access-tokens.ts`, `src/gateways/auth/guard.ts` (provider-bound token claims)
- `src/gateways/auth/ui/security-prefs.js` and `src/gateways/auth/ui/languages/*/strings.xml` (new settings security UI)
- `src/adapters/auth/local/*`, `src/adapters/auth/ldap/*`, `src/adapters/auth/oidc/*`, `src/adapters/auth/saml/*` (adapter maturity and capabilities)
- `src/gateways/auth/tests/*` and `src/adapters/auth/*/tests/*` (coverage updates)
- Version manifests and `src/docs/versions.*.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/5943c6b5689c6a4ddc9fde487bc128f45bd1be25
