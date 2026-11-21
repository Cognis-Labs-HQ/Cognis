# Usage

Practical procedures for Gateway and Adapter.

## Prerequisites

Gateway and adapter availability follows installed dependencies.

## Examples

Compare the gateway's shared responsibilities with one adapter's connection settings, then configure that adapter through its owning gateway.

```ts
// Contribute (from a gateway or adapter bootstrap):
ctx.capabilities.contribute("notify:dispatch", (message) =>
    gateway.dispatch(message),
);

// Consume (in a later gateway's bootstrap):
const dispatch =
    ctx.capabilities.require<
        (message: NotificationEnvelope) => Promise<NotificationDispatchResult>
    >("notify:dispatch");
```

## Expected Results

Providers contribute declared actions while enabled; removing one does not grant another provider its permissions.

## Troubleshooting

Diagnose the owner of a failed action before changing unrelated components.
