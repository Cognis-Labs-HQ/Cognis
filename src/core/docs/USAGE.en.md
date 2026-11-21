# Usage

Practical procedures for Core.

## Prerequisites

Feature availability depends on installed components and their required dependencies.

## Examples

Inspect a component's dependency status, enable an allowed component and verify its contributed action appears in its owning page.

```ts
const record = ctx.requireCapability("engagement:recordActivity");
await record(activity);
```

## Expected Results

Features contribute capabilities during their active lifetime; disabling them removes owned registrations.

## Troubleshooting

Resolve missing dependencies rather than importing another component's implementation or bypassing its lifecycle.
