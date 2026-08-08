# Safer, translated runtime logging settings

## Logging adapters now own configuration rules

Console and file adapters define their own validation and logger configuration mapping, keeping adapter-specific settings out of the gateway route.

## File logging overrides are constrained

The runtime form no longer permits changing the environment-owned log path, and rejects unsafe rotation sizes and retention counts before applying an override.

## Logging settings are translated

Console and file setting labels now use component-owned German, English, Indonesian, and Japanese resources.

The Administration popup now loads each adapter's announced language resources before rendering its configuration fields.
