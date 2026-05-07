# File Storage Gateway

## Overview

The File Storage Gateway provides the platform with a uniform interface for reading, writing, and appending files. It bootstraps the local file adapter and contributes four capabilities to the capability store so that other gateways — the profile gateway for avatar uploads and the logging gateway for log writes — can access file operations without knowing whether they are writing to the local filesystem, an S3 bucket, or any other backend.

The gateway is permanently enabled (`required: true` in its manifest) and does not support adapter swapping at runtime. The local file adapter is the only concrete implementation today, but the `FileStorageGateway` interface is defined in `src/gateways/files/gateway.ts` so that alternative implementations can be added without changing the gateway bootstrap or any consumer.

## Responsibilities

- Instantiate `LocalFileGateway` with the storage root derived from `MEDIA_LOCATION`.
- Contribute `file:gateway`, `file:write`, `file:read`, and `file:append` to the capability store.
- Register the `files` gateway in the gateway registry.

Not responsible for: deciding where files are physically stored (that is the adapter's concern), enforcing file size limits (the profile gateway enforces those), or serving files over HTTP directly (the profile file routes handle downloads).

## Architecture

### FileStorageGateway interface

```ts
export interface FileStorageGateway {
    put(
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    store(
        userId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    get(key: string): Promise<Uint8Array | null>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<StoredObject[]>;
}
```

`store()` generates a UUID-based filename under `{userId}/` and delegates to `put()`. `put()` writes to an explicit key path. Both return a `StoredObject` with `key`, `size`, `contentType`, and `lastModified`.

### Capabilities contributed

| Capability     | Type                                    | Description                                              |
| -------------- | --------------------------------------- | -------------------------------------------------------- |
| `file:gateway` | `FileStorageGateway`                    | The full file gateway instance                           |
| `file:write`   | `(filePath, content) => Promise<void>`  | Overwrites a file at an absolute path                    |
| `file:read`    | `(filePath) => Promise<Buffer \| null>` | Reads a file; returns `null` if not found                |
| `file:append`  | `(filePath, content) => Promise<void>`  | Appends a string to a file (used by the logging gateway) |

The `file:append` capability is separate from `file:gateway` because it is used by the logging gateway for log writes. The logging gateway reads `file:append` from the capability store; this means log writes route through the file gateway abstraction even though the logging gateway never holds a reference to the full `FileStorageGateway` instance.

### Bootstrap sequence

Bootstrap in `src/gateways/files/bootstrap.ts`:

1. Reads `MEDIA_LOCATION` (default `/app/media`).
2. Constructs the storage root as `${mediaLocation}/uploads`.
3. Instantiates `LocalFileGateway(fileStorePath)`.
4. Contributes all four capabilities.
5. Registers the gateway.

Source: `src/gateways/files/bootstrap.ts`, `src/gateways/files/gateway.ts`, `src/adapters/file/local/adapter.ts`.

## Configuration

| Variable         | Default      | Description                                                               |
| ---------------- | ------------ | ------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Root directory for media storage; uploads go to `$MEDIA_LOCATION/uploads` |
