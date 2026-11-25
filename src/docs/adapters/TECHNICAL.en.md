# Technical Reference

Adapters provide gateway-owned implementations, registrations and configuration for installed features.

## Interfaces

An adapter lives under `src/adapters/<gateway>/<adapter>/`. Its package entrypoint exports the factory or bootstrap hook required by that gateway. Optional `defineContracts(ctx)` declares adapter-owned runtime contracts through `system:contracts`.

## Configuration

Provider settings come from the owning gateway’s configuration schema and config routes. Credentials, enabled state and external connection requirements are specific to the adapter. [Gateway contracts](/docs/gateways/technical) describe discovery and lifecycle boundaries.

## Behavior

Adapters may own domain stores, routes and UI: Social Profile is an adapter of Social, not a gateway. Database drivers execute structured database commands; account, profile and message schemas belong to those domain owners. Adapter loading runs in an owner scope whose registrations are removed on rollback or disable.

## Security

Cross-component actions resolve public ctx capabilities or flows. A package import or an enabled adapter does not establish user authorization. Provider diagnostics must exclude credentials.

## Reference

- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/adapters/social/profile/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/index.ts)
