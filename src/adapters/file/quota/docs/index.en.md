# File Quota Adapter

## Overview

The file quota adapter is a DB-backed policy store consumed internally by the files gateway before every write. It owns two things: admin-tunable default quotas (per namespace, plus one global default across all namespaces) and per-user quota snapshots that are taken from those defaults at account-creation time. It does **not** track how much storage a user has actually used — usage accounting lives in the files gateway's own file object metadata table, since it is naturally colocated with per-object size data.

## Responsibilities

- Store a default quota per registered namespace, seeded lazily the first time an admin views the namespace-defaults list (`ensureNamespaceDefault`).
- Store a single global default quota across all namespaces.
- Snapshot the current defaults into per-user override rows at account-creation time (`provisionUser`), so a user's quota reflects what applied when they registered rather than drifting with later admin changes.
- Allow admins to edit a user's per-namespace or global quota after provisioning.

Not responsible for: usage accounting (the files gateway's `DbFileObjectStore` does this) or enforcing the quota (the files gateway's `NamespaceFileService` compares usage against these values before every write).

## Architecture

`DbFileQuotaStore` in `src/adapters/file/quota/index.ts` implements the `FileQuotaStore` contract (`src/gateways/files/reuse/quota-store-contract.ts`) against four tables:

| Table                           | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| `file_namespace_quota_defaults` | Admin-tunable default quota per namespace id |
| `file_global_quota_default`     | Single-row global default (id `"global"`)    |
| `file_user_namespace_quotas`    | Per-user, per-namespace quota override       |
| `file_user_global_quotas`       | Per-user global quota override               |

Built-in fallback constants apply when no default has ever been set: `1 GiB` per namespace, `5 GiB` globally. These are conservative starting points sized for personal documents and small media attachments (profile avatars/banners); admins should raise them via the admin routes below for namespaces expected to hold larger content (e.g. classroom materials) once those features are built out.

### Lazy schema initialization

Like the files gateway itself, this adapter bootstraps before the database gateway is guaranteed to be ready (see `GatewayService.bootstrap()`'s fixed ordering). Schema creation (`ensureSchema()`) is therefore deferred to the first real call and memoized, rather than performed eagerly at bootstrap.

### Provisioning is idempotent

`provisionUser(username)` inserts one row per registered namespace plus one global row, using `conflict: { action: "ignore" }` so calling it repeatedly (e.g. on every login, not just first registration) never overwrites an existing override.

## Configuration

This adapter has no environment-variable configuration; default quotas are set through the files gateway's admin routes (`/api/v1/files/admin/namespace-defaults`, `/api/v1/files/admin/global-default`) rather than environment variables, so they can be changed at runtime without a restart.
