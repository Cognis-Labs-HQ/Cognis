# Reusable Passphrases

## Passphrase capability for modules

Added a cryptographically random word-passphrase generator with caller-controlled word count, separator, and capitalization. The API runtime exports it through `ctx` so modules such as Jitsi Meet can generate readable secrets without importing API internals.
