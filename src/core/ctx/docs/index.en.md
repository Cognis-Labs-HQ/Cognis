# Core Ctx and Flow Bus

## Overview

`src/core/ctx/` defines the platform-level `ctx` capability bus as a dedicated core surface. It is intentionally unassuming: components contribute capabilities, register flows, and inject staged flow hooks without importing each other's internals.

The same ctx instance is meant to be shared across core, gateways, adapters, modules, and route bootstrap. This makes feature composition explicit and reversible: when a component is disabled, its flow hooks and capabilities can be removed without forcing unrelated code changes.

The flow model treats work as named lifecycles with deterministic stages. A flow can represent backend operations (create user, change password), messaging actions (send message, create meeting), or UI construction (construct settings page, construct login page).

## Responsibilities

- Provide a single capability contribution and lookup surface.
- Register named flows with ordered stage definitions.
- Allow components to inject and remove flow stage hooks.
- Execute flows stage-by-stage with stable ordering.
- Return stage execution outputs for observability and tests.

Not responsible for: persistence, HTTP route wiring, adapter discovery, or component enable/disable policy decisions.

## Architecture

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

## Configuration

This component has no runtime environment variable configuration.

## Extension Points

- Contribute cross-component capabilities via `ctx.contributeCapability(key, value)`.
- Register new orchestration pipelines via `ctx.registerFlow({ id, stages })`.
- Inject flow behavior via `ctx.addFlowStageHook(flowId, stageId, hook, handler)`.
- Remove behavior on component disable via `ctx.removeFlowStageHook(...)` and `ctx.unregisterFlow(...)`.

## API Routes

This component does not register HTTP routes directly.

## ctx.flow API

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

### Standard stage names

Use these well-known stage names when contributing hooks to canonical flows:

| Flow                     | Stages (in order)                                                     |
| ------------------------ | --------------------------------------------------------------------- |
| `login`                  | `resolve-provider`, `authenticate`, `establish-session`               |
| `construct-login-ui`     | `resolve-shell`, `resolve-methods`, `augment-methods`, `compose-form` |
| `construct-settings-ui`  | `resolve-sections`, `augment-sections`, `compose-page`                |
| `bootstrap-platform`     | `register-flows`, `post-boot`                                         |
| `send-message`           | `validate-message`, `persist-message`, `fan-out`                      |
| `construct-messaging-ui` | `resolve-navigation`, `compose-surface`                               |
| `create-meeting`         | `validate-request`, `schedule`, `notify-participants`                 |
| `construct-meetings-ui`  | `resolve-providers`, `compose-surface`                                |
| `provision-user`         | `validate-request`, `persist-account`, `emit-events`                  |
| `deprovision-user`       | `authorize-request`, `persist-state`, `cleanup-dependencies`          |

### Usage examples

#### Guard-and-inject (most common)

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

#### Multiple hooks for the same flow

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

#### Running a flow (from route handlers)

```ts
const systemCtx = capabilities.get<Ctx>("system:ctx");
if (systemCtx?.flow.exists("login")) {
    const result = await systemCtx.flow.run("login", { provider, credentials });
    const authResults = result.stageResults["authenticate"] as Array<{
        success: boolean;
    }>;
}
```

#### `NULL_FLOW_API` fallback

Contexts that may not have a flow bus available (e.g., module bootstrap before
canonical flows are registered) use `NULL_FLOW_API` as a safe no-op:

```ts
import { NULL_FLOW_API, CTX_CAPABILITY } from "@cognis/core";
const flow =
    options?.getCapability?.<Ctx>(CTX_CAPABILITY)?.flow ?? NULL_FLOW_API;
```

All `NULL_FLOW_API` methods are no-ops: `exists()` returns `false`, `extend()`
returns `false`, and `run()` rejects immediately.
