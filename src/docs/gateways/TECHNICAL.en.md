# Technical Reference

Gateway bootstrap connects a domain’s public contracts, routes and optional adapters to the host.

## Interfaces

`bootstrap(ctx)` receives `GatewayBootstrapContext`: capability, route, gateway and UI registries, flow access, adapter root and logging. A gateway declares its versioned domain contracts through `system:contracts`; adapters can declare their own contracts with `defineContracts(ctx)`.

## Configuration

`COGNIS_GATEWAYS_ROOT` and `COGNIS_ADAPTERS_ROOT` select discovery roots. A gateway manifest declares `id`, immutable `uuid`, `version` and UUID-based `requires`. Its `documentation` points to localized `docs/README.en.md`, `docs/USAGE.en.md` and `docs/TECHNICAL.en.md`. [The document standard](/docs/standard/technical) defines all translations.

## Behavior

GatewayService discovers bootstrap entrypoints and resolves dependency order. Runtime registry versions come from `readGatewayManifestVersion`, not a second literal. Registrations belong to bootstrap scopes and are rolled back on failure. A gateway’s adapter loader supplies the adapter-specific context; hooks and factories differ by domain. Provider-specific manual steps belong in [Usage](/docs/gateways/usage).

## Security

Consumers resolve public capabilities or named flows rather than importing another component’s implementation. Required contracts must be available before an operation runs. Routes and mutations enforce account and resource authorization in the owning domain.

## Reference

- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/core/services/gateway-service.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/services/gateway-service.ts)
- [src/gateways/reuse/manifest-version.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/manifest-version.ts)
- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
