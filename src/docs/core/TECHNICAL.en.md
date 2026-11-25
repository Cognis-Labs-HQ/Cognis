# Technical Reference

Core defines ctx execution, component lifecycle and provider-neutral type contracts.

## Interfaces

`createCtx()` exposes capability registration/lookup and staged flows. `ctx.flow.exists`, `extend` and `run` operate on named flows; run results contain `data` and `stageResults`. `system:contracts` is the versioned runtime contract registry; domain owners define their contracts there. `AuthAccountStore`, `AccessRole` and `RoleAccessPolicy` are exported types, not automatically registered capability IDs.

## Configuration

The host supplies stores and registries. Module manifests declare stable UUIDs, dependencies and entrypoints. Database transport configuration belongs to [DB](/docs/gateways/db/technical); role ordering and exact-role checks are defined in [Access Policy](/docs/acl-matrix/technical).

## Behavior

Gateway and module services load enabled contributions within owner scopes. Disposal removes owned registrations; failed bootstrap rolls them back. A flow executes its declared stages in order, collecting stage results for subsequent handlers. Module installation, enablement and removal follow the host’s module lifecycle rather than importing sibling implementations.

## Security

Core lifecycle and structural contract resolution do not authorize a resource operation. The owner must validate the current account, role and resource before executing protected work. External modules receive scoped public contracts rather than unrestricted host internals.

## Reference

- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/core/contracts/auth-account.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/auth-account.ts)
- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/access-policy.ts)
