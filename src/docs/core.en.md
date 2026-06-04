# Core

## Overview

`src/core/` is the foundation layer of Cognis. It contains provider-agnostic contracts, interfaces, policy services, and the ctx flow bus that the rest of the platform depends on. Core defines what capabilities exist and what rules govern them — it never contains provider-specific implementation.

The critical rule is that core never imports from gateway or adapter code. The dependency arrow always points inward: gateways import from core; core does not know gateways exist. This invariant keeps core stable and testable in isolation, and it ensures that swapping a gateway or adapter cannot break the contract layer.

Core currently exposes service primitives plus the ctx capability/flow bus. The design philosophy remains minimal: domain behavior lives in gateways/adapters/modules, while core provides orchestration contracts and shared lifecycle primitives.

## Responsibilities

- Define the `DatabaseGateway`, `FileStorageGateway`, `AuthAccountStore`, `AuthContext`, and other cross-cutting interfaces consumed by gateways.
- Provide `ModuleService` for module lifecycle management (discovery, enable, disable, pointer writing, route safety enforcement).
- Provide `HealthService` for platform health and uptime metadata.
- Provide `createCtx` as the cross-component capability bus and staged flow orchestrator.
- Define the `ModuleManifest` contract that all modules must satisfy.
- Expose the capability namespaces `system:health`, `auth:accounts`, `modules:lifecycle`, and `ui:shell`.

Not responsible for: implementing authentication, storing data, sending notifications, or any operation that touches a provider SDK.

## Architecture

### Key source locations

| Path                                    | Purpose                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| `src/core/contracts/auth-account.ts`    | `AuthAccount`, `ExternalIdentity`, `AuthAccountStore` interfaces |
| `src/core/contracts/module-manifest.ts` | `ModuleManifest` interface                                       |
| `src/core/services/module-service.ts`   | `ModuleService` class                                            |
| `src/core/services/health-service.ts`   | `HealthService` class                                            |
| `src/core/services/gateway-service.ts`  | Gateway registry service                                         |
| `src/core/ctx/`                         | Ctx capability bus and staged flow orchestration primitives      |
| `src/core/index.ts`                     | Public exports for the `@cognis/core` package                    |

### ModuleService

`ModuleService` in `src/core/services/module-service.ts` governs the full module lifecycle. It operates on a `ModuleRuntimeGateway` abstraction and an optional `ModulePathResolver`. When a path resolver is present, enable/disable operations write and remove pointer files (nginx-style `<id>.load` symlinks) that point to either a trusted internal directory or a runtime extraction directory for external archives.

Before enabling any module, `ModuleService` enforces two guardrails:

- Core modules (`class: "core"` in the manifest) cannot be toggled at runtime.
- External modules require explicit disclaimer acknowledgement before the pointer is written.

Route safety is enforced before any module is activated: if the module's `routes.json` declares a path under a protected prefix (`/api/v1/system`, `/api/v1/auth`, `/api/v1/users`, `/public`, `/ui`), enablement is rejected.

```ts
// src/core/services/module-service.ts
export class ModuleService {
    async enable(
        moduleId: string,
        options?: { acknowledgeExternalDisclaimer?: boolean },
    ): Promise<{ moduleId: string; enabled: boolean }>;
    async disable(
        moduleId: string,
    ): Promise<{ moduleId: string; enabled: boolean }>;
    async list(): Promise<ModuleManifest[]>;
}
```

### HealthService

`HealthService` in `src/core/services/health-service.ts` records the server start time and returns a `HealthStatus` object on demand. It is stateless beyond the start timestamp.

```ts
export interface HealthStatus {
    status: "ok";
    timestamp: string;
    startedAt: string;
    uptimeMs: number;
}
```

### AuthAccountStore interface

`AuthAccountStore` in `src/core/contracts/auth-account.ts` is the interface that auth adapters must implement for account persistence. It covers finding accounts by external identity, creating external accounts, and creating local accounts.

```ts
export interface AuthAccountStore {
    findByExternalIdentity(
        provider: string,
        externalUserId: string,
    ): Promise<AuthAccount | null>;
    createExternalAccount(identity: ExternalIdentity): Promise<AuthAccount>;
    updateExternalAccount(
        accountId: string,
        identity: ExternalIdentity,
    ): Promise<AuthAccount>;
    createLocalAccount(input: {
        username: string;
        passwordHash: string;
        email?: string;
        isAdmin?: boolean;
    }): Promise<AuthAccount>;
}
```

### Capability namespaces

| Capability          | Owner                | Description                                                        |
| ------------------- | -------------------- | ------------------------------------------------------------------ |
| `system:health`     | Core / system routes | Exposes platform health and uptime via `GET /api/v1/system/health` |
| `auth:accounts`     | Auth gateway         | Built-in account lifecycle and authentication policy wiring        |
| `modules:lifecycle` | Module routes        | Module listing, enable/disable controls, and policy checks         |
| `ui:shell`          | UI routes            | Shared application shell routing and admin operations surface      |

### Ctx flow bus

`src/core/ctx/` defines a composable `createCtx()` surface that supports:

- capability contribution and lookup (`contributeCapability`, `getCapability`, `requireCapability`)
- flow lifecycle registration (`registerFlow`, `unregisterFlow`, `hasFlow`, `listFlows`)
- staged hook injection (`addFlowStageHook`, `removeFlowStageHook`)
- deterministic flow execution (`runFlow`)

Flows are ordered stage pipelines that components can extend without direct imports between owners. A single flow can orchestrate backend behavior (e.g. login, password change) and UI construction behavior (e.g. construct login page, construct settings page), while optional adapters/modules hook into stages only when enabled.
