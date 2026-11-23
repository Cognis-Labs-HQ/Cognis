# Technical Reference

The public interfaces and operational rules of Passphrase Utility.

## Interfaces

reuse:generatePassphrase is a synchronous ctx capability returning a string. Invalid word count or separator length throws RangeError; invalid types or capitalization throw TypeError.

## Configuration

words must be a safe integer from 1 to 128. separator defaults to a hyphen and is limited to sixteen characters. capitalization accepts lowercase (default), uppercase or titlecase.

## Behavior

### Passphrase Utility

The API runtime provides `reuse:generatePassphrase` through `ctx` so modules such as Jitsi Meet can generate readable secrets without importing API internals.

## Security

Each word is selected using Node crypto.randomInt. Generation does not store or authorize the secret; callers must protect it and must not log the resulting passphrase.

## Reference

### Technical specification

The capability accepts a positive `words` count and optional `separator` and `capitalization` controls. Capitalization may be `lowercase`, `uppercase`, or `titlecase`; the defaults are lowercase words separated by hyphens.

The generator selects every word with Node.js cryptographic randomness. Callers should request enough words for their security requirements and must not log generated passphrases.
