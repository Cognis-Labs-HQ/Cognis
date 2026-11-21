# Technical Reference

The public interfaces and operational rules of File Logs.

## Interfaces

The component is configured through its owning gateway, not a separate administration service.

## Configuration

`level` uses the gateway-supported levels. `rotateMaxBytes` is a finite positive number, `rotateMaxFiles` a nonnegative integer, and `rotateCompress` a boolean.

## Behavior

The adapter supplies `fileLevel` and the rotation settings `maxBytes`, `maxFiles` and `compressRotated`. The Logging gateway owns file persistence and rotation.

## Security

Only administrators may change delivery or storage configuration. Client requests retain the authentication and resource permissions enforced by the owning gateway.

## Reference

Source and package metadata: `src/adapters/logging/file/`.
