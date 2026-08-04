# Harden the production asset runtime

## Production startup uses compiled assets

The production start command now configures the generated UI manifest and compiled gateway, adapter, and module roots before launching the compiled server.

## Content encoding follows client quality preferences

Static asset negotiation now excludes encodings rejected with a zero quality value and selects the available Brotli or gzip representation with the highest accepted quality.
