# Usage

Practical procedures for Passphrase Utility.

## Prerequisites

A feature must expose a generation action; this utility has no standalone user page.

## Examples

Generate a new passphrase, store it using the feature's protected mechanism and share it only with intended participants.

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

Retrieve the capability from the module bootstrap context and request the desired word count and presentation:

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Expected Results

Generation combines independently sampled words; it does not itself persist, deliver or authorize the resulting secret.

## Troubleshooting

Do not treat a generated value as automatically saved. Integrators should inspect the capability contract before choosing word count or separators.
