# FOR AI: Cognis Design Principles

## Core architecture
- API handlers define **what** happens; gateways/adapters define **how** it is executed.
- Keep contracts in `core/contracts` and business logic in `core/services`.
- Swap auth providers (local, OIDC, LDAP, SAML) by injecting an `AuthGateway` implementation, not by rewriting routes.

## Data and persistence
- Persist account/auth data and UI preferences through explicit schemas and storage abstractions.
- Support multiple DB providers with provider-specific init assets under `db/init/<provider>`.
- Keep provider selection configuration-driven (`DB_TYPE`).

## UI architecture
- Non-login pages must render through shared layout guardrails from `ui/src/layouts`.
- Shared utilities belong in `ui/src/reuse`; page specifics remain in `ui/src/app`.
- HTML templates are separate from JS behavior and loaded dynamically.

## Security and observability
- Security headers/CSP applied for served UI.
- Structured logs go to terminal and file, controlled by `LOG_LEVEL` + `LOG_FILE`.
- Health endpoints provide operational metadata (timestamp, startedAt, uptime).

## Product UX principles
- UI is API-first: docs/auth/preferences flow through API endpoints.
- Keep URLs clean (`/dashboard`, `/login`, `/docs`).
- Preserve safe customization boundaries with layout rows/columns guardrails.
