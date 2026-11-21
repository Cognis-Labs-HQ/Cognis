# Usage

Practical procedures for Learning Progress.

## Prerequisites

Practice through an enabled Study activity; classroom records require current access.

## Examples

Finish an attempt, review its feedback and return to the relevant activity later to continue from recorded progress.

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Expected Results

Events persist across restarts; trusted practice may award XP. Corrections append history rather than rewriting it.

## Troubleshooting

Check account and classroom context. Retrying the same event does not create extra progress or rewards.
