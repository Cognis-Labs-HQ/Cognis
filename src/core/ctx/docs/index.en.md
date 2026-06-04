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
