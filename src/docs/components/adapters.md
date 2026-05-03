# Adapters Component

## Purpose
`adapters/` contains provider-specific implementations for core gateway interfaces.

## Database adapters
- `db-memory`: reference/testing adapter.
- `db-mariadb`: MariaDB gateway implementation plus auth-account schema bootstrap helper (`ensureMariaDbAuthSchema`).
- `db-postgres`: PostgreSQL gateway implementation plus auth-account schema bootstrap helper (`ensurePostgresAuthSchema`).
- `db-sqlite`: SQLite gateway implementation plus auth-account schema bootstrap helper (`ensureSqliteAuthSchema`).

## File adapter

### `file-local` — local filesystem implementation

Implements `FileStorageGateway` from `@cognis/core` using Node's `node:fs/promises` API.

**Storage root**: `$MEDIA_LOCATION/uploads` (default: `/app/media/uploads`). Set via the `MEDIA_LOCATION` environment variable.

**Interface**:

| Method | Signature | Description |
|---|---|---|
| `store` | `store(userId, content, contentType?)` | Generates a UUID filename under `{userId}/{uuid}.{ext}`. Returns `StoredObject`. |
| `put` | `put(key, content, contentType?)` | Writes a file at an explicit key path. Creates parent directories as needed. Returns `StoredObject`. |
| `get` | `get(key)` | Returns file bytes, or `null` if not found. |
| `delete` | `delete(key)` | Removes a file. Returns `true` on success, `false` if not found. |
| `list` | `list(prefix?)` | Lists all files under an optional directory prefix. Returns `StoredObject[]`. |

**`StoredObject` shape**:
```ts
{
  key: string;          // relative path used as the storage key
  size: number;         // bytes written
  contentType?: string; // MIME type, when provided
  lastModified: Date;   // filesystem mtime
}
```

**Key isolation**: `store()` places every upload under the calling user's ID prefix (`{userId}/{uuid}.{ext}`), ensuring per-user isolation without application-level namespace logic.

**Supported content types** (for extension inference): `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Unknown MIME types produce a key without a file extension.

**Docker volume**: `docker-compose.yml` mounts a named volume `appmedia` at `/app/media` so uploads persist across container restarts.

## Auth adapters
- `auth-ldap`: LDAP token/authentication adapter with group-to-admin mapping and optional local break-glass admin creation.
- `auth-saml`: SAML assertion adapter with configurable admin claim mapping.
- `auth-sso-oidc`: OAuth/OIDC SSO adapter for providers such as Google or Microsoft, with role-to-admin mapping and first-login account provisioning.

## Rules
- Adapters may use provider-specific semantics internally.
- Public behavior must conform to core gateway contracts.
