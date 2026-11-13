# Reusable Passphrases

**Feature Branch:** feature-add-passphrase-generator-utility

## Passphrase capability for modules

Added a cryptographically random word-passphrase generator with caller-controlled word count, separator, and capitalization. The API runtime exports it through `ctx` so modules such as Jitsi Meet can generate readable secrets without importing API internals.

## Commits

- [ff93a1d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ff93a1df)
- [b78a79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b78a79d9)
- [cca3201](https://github.com/Cognis-Labs-HQ/Cognis/commit/cca3201a)
- [10d19e6](https://github.com/Cognis-Labs-HQ/Cognis/commit/10d19e66)
