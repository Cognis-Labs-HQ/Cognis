# Usage

Practical procedures for Gateway and Adapter.

## Prerequisites

Review [the access requirements](/docs/gateways) before performing these procedures.

## Examples

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

The example uses the documented interface of Gateway and Adapter. Confirm the response or saved state described in [Technical](/docs/gateways/technical) before repeating a write operation.

## Troubleshooting

If Gateway and Adapter is unavailable, verify your sign-in and ask an administrator to check whether the component and its dependencies are enabled.
