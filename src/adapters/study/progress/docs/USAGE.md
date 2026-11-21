# Usage

Practical procedures for Learning Progress.

## Prerequisites

Review [the access requirements](/docs/adapters/study/progress) before performing these procedures.

## Examples

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Expected Results

The example uses the documented interface of Learning Progress. Confirm the response or saved state described in [Technical](/docs/adapters/study/progress/technical) before repeating a write operation.

## Troubleshooting

If Learning Progress is unavailable, verify your sign-in and ask an administrator to check whether the component and its dependencies are enabled.
