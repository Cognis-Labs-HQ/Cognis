# Passphrase Utility

The API runtime provides `reuse:generatePassphrase` through `ctx` so modules such as Jitsi Meet can generate readable secrets without importing API internals.

## Usage examples

Retrieve the capability from the module bootstrap context and request the desired word count and presentation:

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Technical specification

The capability accepts a positive `words` count and optional `separator` and `capitalization` controls. Capitalization may be `lowercase`, `uppercase`, or `titlecase`; the defaults are lowercase words separated by hyphens.

The generator selects every word with Node.js cryptographic randomness. Callers should request enough words for their security requirements and must not log generated passphrases.
