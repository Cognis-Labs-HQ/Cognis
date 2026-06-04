# Ctx Architecture Enforcement

## Public capability surface in ctx

The `Ctx` interface now exposes three new methods: `contributePublicCapability`,
`isPublicCapability`, and `listPublicCapabilities`. These allow gateway
bootstraps to explicitly declare which capabilities are part of their public
cross-component API surface. Capabilities contributed via the public path are
still accessible through the standard `requireCapability` / `getCapability`
methods but are additionally tracked as explicitly public, enabling automated
enforcement that consumers only call declared public surfaces.

## Gateway contract types moved to core

`AuthContext`, `AuthGateway`, `QueryResult`, `DatabaseGateway`, `StoredObject`,
`FileStorageGateway`, and `AccessRole` are now defined in `src/core/contracts/`
and exported from `@cognis/core`. Gateway files that previously owned these
definitions now re-export them from core. This removes the need for any
component to import directly from a gateway file to obtain a shared type.

## Broken flow hook calls fixed

Two gateway bootstraps used `flowCtx.on(flowId, stageId, handler)` — a
three-argument shorthand that does not exist on the `Ctx` interface and would
have caused a silent runtime failure. Both have been replaced with the correct
`addFlowStageHook(flowId, stageId, { id }, handler)` call form:

- `src/gateways/social/bootstrap.ts` (four hooks)
- `src/gateways/notify/bootstrap/index.ts` (one hook)

## Static boundary enforcement tests

A new test file `src/core/tests/ctx-boundary.test.ts` enforces four rules
statically at test time by scanning source files:

1. Core package must not import from gateways or the API layer.
2. No source file may use the deprecated `flowCtx.on()` shorthand.
3. Gateway contract types must be sourced from `@cognis/core`, not from
   gateway files directly.
4. Gateway implementations must not import production code from other
   gateways. (Cross-gateway shared utilities in `gateways/shared.ts` and
   `gateways/db/reuse/db-executor.ts` are explicitly allowlisted.)

The study gateway previously violated rule 4 by importing `AccessRole` directly
from the auth gateway; that import now goes through `@cognis/core`.

## Changed files/components

- `src/core/ctx/state.ts`
- `src/core/ctx/types.ts`
- `src/core/ctx/create-ctx.ts`
- `src/core/ctx/contribute-public-capability.ts` (new)
- `src/core/ctx/is-public-capability.ts` (new)
- `src/core/ctx/list-public-capabilities.ts` (new)
- `src/core/contracts/auth-gateway.ts`
- `src/core/contracts/db-gateway.ts` (new)
- `src/core/contracts/files-gateway.ts` (new)
- `src/core/index.ts`
- `src/gateways/auth/gateway.ts`
- `src/gateways/auth/access-tokens.ts`
- `src/gateways/db/gateway.ts`
- `src/gateways/files/gateway.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/study/gateway.ts`
- `src/core/tests/ctx.test.ts`
- `src/core/tests/ctx-boundary.test.ts` (new)

## ctx.flow API and ensureCtxCapability removal

Replaces the verbose `ensureCtxCapability` / `addFlowStageHook` pattern with
`ctx.flow.exists()` / `ctx.flow.extend()` / `ctx.flow.run()` throughout the
codebase. Flow injection is now idempotent (`extend()` returns `false` on
duplicate hook id instead of throwing). All gateways, adapters, and modules
now receive `flow: FlowApi` directly from their bootstrap context.

### Changed

- Added `FlowApi` interface and `flow` property to `Ctx` and `GatewayBootstrapBase`
- Added `flow: FlowApi` to `SocialAdapterBootstrapCtx` and `ModuleBootstrapCtx`
- Removed `ensureCtxCapability` and `CtxCapabilityStore` from `@cognis/core`
- All gateway bootstraps and adapters migrated to `ctx.flow.extend()`
- New boundary rules in `ctx-boundary.test.ts` (Rules 5 and 6)
- Expanded `ctx.test.ts` with `ctx.flow` API coverage
