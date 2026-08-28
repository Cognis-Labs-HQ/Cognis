# Reusable Passphrases

**Feature Branch:** feature-add-passphrase-generator-utility

## Passphrase capability for modules

Added a cryptographically random word-passphrase generator with caller-controlled word count, separator, and capitalization. The API runtime exports it through `ctx` so modules such as Jitsi Meet can generate readable secrets without importing API internals.

## Commits

- [Add reusable passphrase capability](https://github.com/Cognis-Labs-HQ/Cognis/commit/ff93a1df)
- [Align passphrase documentation headings](https://github.com/Cognis-Labs-HQ/Cognis/commit/b78a79d9)
- [Document passphrase capability usage](https://github.com/Cognis-Labs-HQ/Cognis/commit/cca3201a)
- [Format passphrase documentation examples](https://github.com/Cognis-Labs-HQ/Cognis/commit/10d19e66)
