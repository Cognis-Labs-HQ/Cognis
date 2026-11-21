# Technical Reference

The public interfaces and operational rules of Core.

## Interfaces

### Extension Points

- Contribute cross-component capabilities via `ctx.contributeCapability(key, value)`.
- Remove owned capabilities during teardown via `ctx.removeCapability(key)`; scoped module bootstrap performs this automatically.
- Register new orchestration pipelines via `ctx.registerFlow({ id, stages })`.
- Inject flow behavior via `ctx.addFlowStageHook(flowId, stageId, hook, handler)`.
- Remove behavior on component disable via `ctx.removeFlowStageHook(...)` and `ctx.unregisterFlow(...)`.

### API Routes

This component does not register HTTP routes directly.

### ctx.flow API

`ctx.flow` is a narrow interface designed for the guard-and-inject pattern.
Components check whether a flow exists before injecting hooks, so a component
that loads before flows are registered is always safe.

### Interface

```ts
interface FlowApi {
    exists(flowId: string): boolean;
    extend(
        flowId: string,
        stageId: string,
        hook: HookMeta,
        handler: StageHandler,
    ): boolean;
    run(flowId: string, input?: unknown): Promise<FlowRunResult>;
}
```

- **`exists(flowId)`** — returns `true` if the flow has been registered.
- **`extend(flowId, stageId, hook, handler)`** — registers a stage hook. Returns `true` on success, `false` if a hook with the same `id` already exists (idempotent, no throw). This is the race-condition guard for concurrent bootstrap paths.
- **`run(flowId, input?)`** — executes the flow and returns per-stage results.

### Running a flow (from route handlers)

```ts
const systemCtx = capabilities.get<Ctx>("system:ctx");
if (systemCtx?.flow.exists("login")) {
    const result = await systemCtx.flow.run("login", { provider, credentials });
    const authResults = result.stageResults["authenticate"] as Array<{
        success: boolean;
    }>;
}
```

### `NULL_FLOW_API` fallback

Contexts that may not have a flow bus available (e.g., module bootstrap before
canonical flows are registered) use `NULL_FLOW_API` as a safe no-op:

```ts
import { NULL_FLOW_API, CTX_CAPABILITY } from "@cognis/core";
const flow =
    options?.getCapability?.<Ctx>(CTX_CAPABILITY)?.flow ?? NULL_FLOW_API;
```

All `NULL_FLOW_API` methods are no-ops: `exists()` returns `false`, `extend()`
returns `false`, and `run()` rejects immediately.

### Module capability declarations

Modules declare consumed services with the top-level manifest field `requiresCapabilities`. Server capabilities use their registered IDs (for example `auth:requireAuth`); browser capabilities use the `ui:` namespace (for example `ui:profileAvatarRenderer`). Cognis attaches declared UI requirements to the module's SPA routes and imports only matching registered provider scripts before mounting the route. Enablement resolves server capabilities through the server context and `ui:` capabilities through active UI registry providers; SPA routing rechecks browser providers before mounting.

Providers must publish the capability ID in their component documentation and, for browser providers, register it through `providesCapabilities`. Operators can inspect the live registry with `GET /api/v1/system/capabilities` as an owner or `cognisctl system:capabilities`. A module whose navigation script contributes a browser capability declares the IDs in `registerNavbarPlugin({ providesCapabilities: [...] })`; the host then imports that script before capability-consuming pages mount.

## Configuration

This component has no runtime environment variable configuration.

## Behavior

### Core Ctx and Flow Bus

The `startSsoLogin` flow starts redirect-based authentication without submitting credential fields. Provider hooks validate their selected provider during `validateProvider`, then create state and return `{ providerId, redirectUrl }` from `initiateAuthorization`. Cognis accepts only relative or HTTPS redirect URLs.

The mandatory `gateAccountCreation` flow runs before an external identity can create a Cognis account. Public registration authorizes creation directly; otherwise the registration gateway requires a single-use registration token whose email matches the provider identity. A missing provider email produces `emailRequired: true`, allowing the SSO surface to ask for it, while cancellation or missing authorization leaves the account uncreated and aborts login.

### Overview

`src/core/ctx/` defines the platform-level `ctx` capability bus as a dedicated core surface. It is intentionally unassuming: components contribute capabilities, register flows, and inject staged flow hooks without importing each other's internals.

The same ctx instance is meant to be shared across core, gateways, adapters, modules, and route bootstrap. This makes feature composition explicit and reversible: when a component is disabled, its flow hooks and capabilities can be removed without forcing unrelated code changes.

The flow model treats work as named lifecycles with deterministic stages. A flow can represent backend operations (create user, change password), messaging actions (send message, create meeting), or UI construction (construct settings page, construct login page).

### Responsibilities

- Provide a single capability contribution and lookup surface.
- Register named flows with ordered stage definitions.
- Allow components to inject and remove flow stage hooks.
- Execute flows stage-by-stage with stable ordering.
- Return stage execution outputs for observability and tests.

Not responsible for: persistence, HTTP route wiring, adapter discovery, or component enable/disable policy decisions.

### Key source locations

| Path                                  | Purpose                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `src/core/ctx/create-ctx.ts`          | Builds a ctx instance from composable function modules                 |
| `src/core/ctx/types.ts`               | Public contracts for capabilities, flows, hooks, and execution results |
| `src/core/ctx/register-flow.ts`       | Flow registration and stage validation                                 |
| `src/core/ctx/add-flow-stage-hook.ts` | Stage hook contribution for component injection                        |
| `src/core/ctx/run-flow.ts`            | Ordered stage execution runtime                                        |

A flow is registered once with explicit stage IDs. Stage hooks are then added by any participating component with an `order` value. During execution, hooks run in ascending order, then by hook ID for deterministic behavior.

Flows can call other flows through `context.ctx.runFlow(...)`, enabling nested composition. Example: a login-page construction flow can invoke login flow logic; login flow hooks can invoke LDAP flow when adapter conditions match.

The runner shallow-freezes each stage's execution context before calling its owner or extension hooks. The `ctx`, `flowId`, `stageId`, `input`, `meta`, `data` and `stageResults` bindings cannot be replaced or deleted, and new context fields cannot be added. Owners and hooks share the same context within a stage; each stage and invocation receives its own context. This does not deep-freeze payloads: `input`, `data` and `stageResults` retain their existing identities and mutable contents. Later stages continue to see accumulated results through the same `stageResults` object. Metadata remains a shallow-frozen copy of the supplied `meta`; nested metadata values are not frozen.

### Standard stage names

Use these well-known stage names when contributing hooks to canonical flows:

| Flow                     | Stages (in order)                                                     |
| ------------------------ | --------------------------------------------------------------------- |
| `login`                  | `resolve-provider`, `authenticate`, `establish-session`               |
| `startSsoLogin`          | `validateProvider`, `initiateAuthorization`                           |
| `gateAccountCreation`    | `inspectIdentity`, `authorizeCreation`                                |
| `construct-login-ui`     | `resolve-shell`, `resolve-methods`, `augment-methods`, `compose-form` |
| `construct-settings-ui`  | `resolve-sections`, `augment-sections`, `compose-page`                |
| `bootstrap-platform`     | `register-flows`, `post-boot`                                         |
| `send-message`           | `validate-message`, `persist-message`, `fan-out`                      |
| `construct-messaging-ui` | `resolve-navigation`, `compose-surface`                               |
| `create-meeting`         | `validate-request`, `schedule`, `notify-participants`                 |
| `construct-meetings-ui`  | `resolve-providers`, `compose-surface`                                |
| `provision-user`         | `validate-request`, `persist-account`, `emit-events`                  |
| `deprovision-user`       | `authorize-request`, `persist-state`, `cleanup-dependencies`          |

### Guard-and-inject (most common)

```ts
if (ctx.flow.exists("construct-settings-ui")) {
    ctx.flow.extend(
        "construct-settings-ui",
        "resolve-sections",
        { id: "notify-gateway:resolve-sections" },
        () => ({
            gatewayId: "notify",
            sectionId: "notifications",
            scriptUrl: "/static/gateways/notify/notification-prefs.js",
        }),
    );
}
```

### Multiple hooks for the same flow

```ts
if (ctx.flow.exists("send-message")) {
    ctx.flow.extend(
        "send-message",
        "validate-message",
        { id: "social-gateway:validate-message" },
        (stageCtx) => {
            const { roomId, ciphertext, iv } = stageCtx.input as Record<
                string,
                string
            >;
            if (!roomId) return { valid: false, reason: "missing_room_id" };
            return { valid: true, roomId, ciphertext, iv };
        },
    );

    ctx.flow.extend(
        "send-message",
        "fan-out",
        { id: "social-gateway:fan-out" },
        (stageCtx) => {
            const persisted = stageCtx.stageResults[
                "persist-message"
            ] as Array<{ messageId?: string }>;
            return { fanOut: Boolean(persisted[0]?.messageId) };
        },
    );
}
```

### Per-invocation owner stages

Core 0.3.109 adds optional per-invocation `handlers` to `FlowRunOptions`. Each owner handler runs before extension hooks in its registered stage, contributes its result to `stageResults`, and shares only that invocation’s `data`. Unknown stages reject before execution. A rejected stage stops later stages. Components keep persistence inside their own transaction so extension-hook failure rolls back writes; per-run handlers are not stored as global hooks.

### Owned server and browser resources

The external bootstrap context supports `registerDisposer(dispose)`. Cleanup runs in reverse registration order after disable, refresh or failed bootstrap; failures are logged while remaining cleanup proceeds. Browser providers export `mountProvider(scopedUiCtx)`, register their capabilities and flows through the scope, bind listeners to its signal and return additional cleanup. The loader reconciles both catalogs and reactivates cached scripts; `ui:navbarLinks` owns navigation DOM.

### Engagement Scoring

The core engagement engine computes evidence-backed XP and awards registered achievements through staged ctx flows.

### Provider workflow

Language and activity providers extend engagement only through public `ctx` capabilities. During bootstrap, require `engagement:scoring` to register fallback activity weights, scheduled scoped modifiers, and redeemable boosters. Require `engagement:achievements` to register normal, rare, or legendary badge definitions. Submit a completed collection through `engagement:recordActivity`; do not award XP for individual self-paced item views.

An activity supplies unique evidence event IDs, provider and participant IDs, content difficulty, completion time, optional provider weight, and scopes such as `language` and `activity`. Explicit provider weights override the activity-type fallback. Difficulty, weights, modifiers, hints, accuracy, independent answers, first completion, repeat status, and provider timing targets all contribute to the score. Repeats use one discrete reduced rate rather than continual decay.

### Orchestration

`engagement:recordActivity` runs `engagement:scoreActivity` through `validate`, `score`, `achievements`, and `publish`. Its achievement stage composes `engagement:evaluateAchievements`, whose `collect`, `evaluate`, and `award` stages allow removable contributions. Providers may extend these flows without importing core internals.

### Safety and evidence

Weights and multipliers accept values from `0.01` through `10`; difficulty accepts `0.1` through `10`. Event IDs must be unique, durations and hint counts must be non-negative, and timing targets must be ordered. Consumable boosters are participant-specific and removed after their first matching score. Achievement awards freeze their labels, difficulty, icon, award time, and evidence IDs so later definition changes cannot rewrite earned badges.

### Durable Practice Rewards

`engagement:recordActivity` now validates, scores, evaluates achievements, persists a receipt, then publishes. The host injects `engagement:store`; production storage belongs to the Database gateway. Participant revisions reject conflicting writes. Replaying the same activity preserves its XP and awards; changed inputs or reused evidence are rejected. Scoring and award evaluation use isolated state until persistence succeeds. `engagement:ledger` exposes authoritative summaries, durable booster redemption and activity invalidation. Redeemed boosters and consumed evidence survive restarts. `repeatKey` groups repeated practice without changing the original receipt; corrections remove invalidated XP and award projections while retaining history. Low-level scoring methods remain policy calculators; durable consumers use the ledger and record capability.

Ledger summaries, booster redemption and activity invalidation run dedicated ctx flows with validation and execution stages. Invalid participant identifiers are rejected before reading or changing persistence.

## Security

Capability ownership and bootstrap scopes control registration lifetime. Privileged handlers must authorize their caller before state changes; persistent engagement receipts validate actor, evidence and idempotent activity identity before rewards are published.

## Reference

- [src/core/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/package.json)
- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
