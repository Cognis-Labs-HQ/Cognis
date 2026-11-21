# Usage

Practical procedures for Passphrase Utility.

## Prerequisites

Review [the access requirements](/docs/passphrase-utility) before performing these procedures.

## Examples

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Expected Results

The example uses the documented interface of Passphrase Utility. Confirm the response or saved state described in [Technical](/docs/passphrase-utility/technical) before repeating a write operation.

## Troubleshooting

If Passphrase Utility is unavailable, verify your sign-in and ask an administrator to check whether the component and its dependencies are enabled.
