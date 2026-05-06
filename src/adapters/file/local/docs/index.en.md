# Local File Storage Adapter

## Overview

The local file adapter stores uploaded files on the server's local filesystem under a configured media directory. It is the only file storage adapter in the current platform and its manifest carries `"locked": true`, which means it cannot be disabled or replaced through the adapter UI. Any future cloud storage adapter (S3, GCS, Azure Blob) would be a drop-in replacement for this adapter because both implement the `FileStorageGateway` interface.

The adapter enforces per-user key namespacing: files uploaded via `store()` are always placed under `{userId}/`, preventing one user's uploads from colliding with or being confused for another's.

## Responsibilities

- Implement the `FileStorageGateway` interface: `put`, `store`, `get`, `delete`, and `list`.
- Derive a stable file extension from the MIME type of each uploaded file.
- Generate UUID-based filenames for files stored via `store()`.
- Scope stored files to `{userId}/{uuid}.{ext}` keys.
- Serve files from `$MEDIA_LOCATION/uploads` on the local filesystem.

Not responsible for: serving files over HTTP (the profile gateway's file routes do that), enforcing upload size limits (the profile gateway enforces those before calling the adapter), or access control (the profile gateway checks permissions before calling the adapter).

## Architecture

`LocalFileGateway` in `src/adapters/file/local/adapter.ts` holds the storage root path (`$MEDIA_LOCATION/uploads`) and a MIME-to-extension map.

### MIME-to-extension map

| MIME type | Extension |
| --------- | --------- |
| `image/jpeg` | `jpg` |
| `image/jpg` | `jpg` |
| `image/png` | `png` |
| `image/webp` | `webp` |
| `image/gif` | `gif` |

Files with MIME types not in this map are stored with a `.bin` extension.

### Key isolation

`store(userId, content, contentType)` generates a `uuid` and writes to `{userId}/{uuid}.{ext}`:

```ts
async store(userId: string, content: Uint8Array, contentType?: string): Promise<StoredObject> {
  const ext = this.extFromMime(contentType);
  const key = `${userId}/${randomUUID()}.${ext}`;
  return this.put(key, content, contentType);
}
```

`put(key, content, contentType)` writes to `${storageRoot}/${key}`, creating any intermediate directories with `mkdir -p` semantics.

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

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `MEDIA_LOCATION` | `/app/media` | Root directory for media; uploads stored at `$MEDIA_LOCATION/uploads` |
