# Technical Reference

The public interfaces and operational rules of Console Logs.

## Interfaces

The component is configured through its owning gateway, not a separate administration service.

## Configuration

`level` must be one of the levels supplied by the Logging gateway. `format` accepts `pretty` or `json`.

## Behavior

Validated values become `consoleLevel` and `consoleFormat` in the logger configuration. This built-in adapter is locked; its manifest does not offer an independent disable action.

## Security

Only administrators may change delivery or storage configuration. Client requests retain the authentication and resource permissions enforced by the owning gateway.

## Reference

Source and package metadata: `src/adapters/logging/console/`.
