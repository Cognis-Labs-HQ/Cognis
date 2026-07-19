# Local File Storage Adapter

## Overview

The local file adapter stores uploaded files on the server's local filesystem under a configured media directory. It is the only file storage adapter in the current platform and its manifest carries `"locked": true`, which means it cannot be disabled or replaced through the adapter UI. Any future cloud storage adapter (S3, GCS, Azure Blob) would be a drop-in replacement for this adapter because both implement the `FileStorageGateway` interface.

The adapter is namespace-scoped: every operation takes a `namespaceId` first, and physical storage is rooted at `{storageRoot}/{namespaceId}/...`, so files belonging to different namespaces (e.g. `profile` vs `user`) never collide on disk even if they happen to share the same relative key.

## Responsibilities

- Implement the namespaced `FileStorageGateway` interface: `put`, `store`, `get`, `delete`, and `list`, all namespace-first.
- Derive a stable file extension from the MIME type of each uploaded file.
- Generate UUID-based filenames for files stored via `store()`.
- Scope stored files to `{namespaceId}/{actorId}/{uuid}.{ext}` on disk.
- Serve files from `$MEDIA_LOCATION/uploads` on the local filesystem.

Not responsible for: serving files over HTTP (the files gateway's routes do that), enforcing ACL or quota (the files gateway's `NamespaceFileService` checks those before ever calling this adapter).

## Architecture

`LocalFileGateway` in `src/adapters/file/local/index.ts` holds the storage root path (`$MEDIA_LOCATION/uploads`) and a MIME-to-extension map.

### MIME-to-extension map

| MIME type    | Extension |
| ------------ | --------- |
| `image/jpeg` | `jpg`     |
| `image/jpg`  | `jpg`     |
| `image/png`  | `png`     |
| `image/webp` | `webp`    |
| `image/gif`  | `gif`     |

Files with MIME types not in this map are stored with a `.bin` extension.

### Namespace + key isolation

`store(namespaceId, actorId, content, contentType)` generates a `uuid` and writes to `{namespaceId}/{actorId}/{uuid}.{ext}`; `put(namespaceId, key, content, contentType)` writes to `${storageRoot}/${namespaceId}/${key}`, creating any intermediate directories with `mkdir -p` semantics. A private `namespaceRoot(namespaceId)` helper resolves the per-namespace root directory used by every method.

### Manifest

`src/adapters/file/local/manifest.json`:

```json
{
    "id": "local",
    "locked": true
}
```

`locked: true` prevents the adapter from appearing in the UI as something that can be swapped or disabled.

## Configuration

| Variable         | Default      | Description                                                                           |
| ---------------- | ------------ | ------------------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Root directory for media; uploads stored at `$MEDIA_LOCATION/uploads/<namespace>/...` |
