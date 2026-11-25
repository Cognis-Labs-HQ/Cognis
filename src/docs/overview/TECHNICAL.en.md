# Technical Reference

Cognis separates host orchestration, domain gateways, adapters and externally installed modules.

## Interfaces

[Core](/docs/core/technical) exports ctx and lifecycle contracts. [API](/docs/api/technical) hosts HTTP dispatch. [Gateways](/docs/gateways/technical) register domain operations, and [adapters](/docs/adapters/technical) implement provider or domain-specific behavior. Profile and Messages are Social adapters. Browser contributions use [UI](/docs/ui/technical) contracts.

## Configuration

Host environment selects gateway/adapter roots, database transport and storage. Administration selects enabled optional components. External module sources and installation are defined by [Modules](/docs/modules/external/technical); account preferences do not select a server database.

## Behavior

Gateway manifests establish dependency order. Bootstrap contributes public capabilities, flows, routes and UI metadata. Consumers resolve these registrations rather than importing another component’s concrete implementation. Owner scopes remove failed or disabled contributions. The Docs reader discovers complete localized bundles and versions from public component metadata.

## Security

Architectural layers establish ownership, not blanket access. Authenticated accounts, shared guests and external modules have distinct policies. Every resource operation checks its owner’s current authorization.

## Reference

- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/api/bootstrap/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/bootstrap/gateway.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
