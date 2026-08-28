# Passphrase Utility

The API runtime provides `reuse:generatePassphrase` through `ctx` for modules such as Jitsi Meet. The capability accepts a positive `words` count and optional `separator` and `capitalization` controls. Capitalization may be `lowercase`, `uppercase`, or `titlecase`; the defaults are lowercase words separated by hyphens.

The generator selects every word with Node.js cryptographic randomness. Callers should request enough words for their security requirements and must not log generated passphrases.
