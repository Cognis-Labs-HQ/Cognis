# File Storage Gateway

## Overview

The File Storage Gateway provides the platform with a uniform, **namespaced** interface for storing and retrieving files. Every file operation is scoped to a namespace — an isolated content area typically owned by one component (`profile`, `chats`, `classes`) plus two baked-in namespaces owned by core (`default`, `user`). Namespaces carry an ACL ceiling and an optional storage quota, so the gateway can support all manner of uploads — private user documents, chatroom attachments, profile avatars/banners, classroom materials — from one enforcement point instead of each component reinventing access control and quota checks.

The gateway is permanently enabled (`required: true` in its manifest) and does not support adapter swapping at runtime. The local file adapter is the only concrete storage backend today, but the `FileStorageGateway` interface is defined in `src/core/contracts/files-gateway.ts` so alternative backends can be added without changing the gateway bootstrap or any consumer.

## Responsibilities

- Instantiate `LocalFileGateway` with the storage root derived from `MEDIA_LOCATION`.
- Own the `NamespaceRegistry`, accepting namespace registrations from any component via the `files:registerNamespace` capability.
- Enforce each namespace's ACL ceiling on every write, and per-object ACL on every read/delete.
- Enforce per-namespace and global storage quotas (via the quota adapter) before every write.
- Contribute the namespaced `files:*` capabilities and namespace-scoped HTTP routes.
- Retain the legacy, non-namespaced `file:write`/`file:read`/`file:append` capabilities used only by the logging gateway for structured log writes (not user content).

Not responsible for: deciding where files are physically stored (the adapter's concern), or interpreting what a `groupIds` entry means (an opaque collaborator-set id chosen by the owning component — a chat room id, a class id, etc.).

## Architecture

### Namespaces

A namespace is registered once, by its owning component, via the `files:registerNamespace` capability:

```ts
ctx.capabilities.get("files:registerNamespace")?.({
    id: "profile",
    ownerComponent: "social-profile",
    acl: { visibility: "component-managed" },
    allowComponents: ["some-other-component"], // optional, "core" is always permitted
});
```

Registration is one-time; a duplicate id throws. Baked-in namespaces (registered by this gateway itself, at its own bootstrap):

| Namespace | Owner | Visibility        | Purpose                                                  |
| --------- | ----- | ----------------- | -------------------------------------------------------- |
| `default` | core  | component-managed | Application/system-owned content (logos, generated docs) |
| `user`    | core  | private-owner     | Strictly private per-user personal repository            |

Component-registered namespaces:

| Namespace | Owner           | Visibility        | Purpose                            |
| --------- | --------------- | ----------------- | ---------------------------------- |
| `profile` | social-profile  | component-managed | Avatars/banners — broadly readable |
| `chats`   | social-messages | private-group     | Chatroom attachments/avatars       |
| `classes` | study-classes   | private-group     | Classroom materials                |

### ACL model

Each namespace declares a `visibility` ceiling that bounds every object written into it:

- **`private-owner`** — object is visible only to its owner, full stop. `groupIds`/`publicRead` are rejected outright at write time.
- **`private-group`** — the owner, or any actor listed in the object's `groupIds`, may access it. `publicRead` is rejected.
- **`component-managed`** — the owner, group members, or (if `publicRead: true`) anyone may access it. The least restrictive tier.

Every write also carries a per-object ACL (`ownerId`, optional `groupIds`, optional `publicRead`) set by the calling component. The gateway rejects any object ACL that claims broader access than its namespace's ceiling permits (`AclCeilingViolationError`, HTTP 400) — an object can never be more open than its namespace allows.

### Quotas

A separate quota adapter (`src/adapters/file/quota/`) tracks:

- Admin-tunable default quota per namespace, plus a single global default across all namespaces.
- Per-user quota snapshots, taken from the current defaults at account-creation time (`files:quota:provisionUser`) so a user's quota reflects what applied when they registered; admins may edit a user's quota afterward.

Usage is tracked incrementally in the file object metadata table (`file_objects`) rather than rescanned on every write. A write that would push either the per-namespace or global usage over quota is rejected with `QuotaExceededError` (HTTP 413).

### Capabilities contributed

| Capability                             | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `files:registerNamespace`              | One-time namespace registration (throws on duplicate id)            |
| `files:namespace`                      | Create a namespace-bound client for a component                     |
| `files:put`                            | Write to an explicit namespace-relative key                         |
| `files:store`                          | Write with a generated UUID-based key under `{actorId}/`            |
| `files:get`                            | Read, subject to ACL                                                |
| `files:delete`                         | Delete, subject to ACL                                              |
| `files:list`                           | List objects in a namespace, filtered to what the caller may access |
| `files:quota:provisionUser`            | Snapshot current namespace/global quota defaults for a (new) user   |
| `file:write`/`file:read`/`file:append` | Legacy, non-namespaced — logging gateway only                       |

Components should prefer `files:namespace` for routine ctx file operations: bind `namespaceId` and `callerComponent` once during bootstrap, then call the returned client with the actor, key, content, and ACL options for each operation. The lower-level `files:put`/`files:store`/`files:get`/`files:delete`/`files:list` capabilities remain available when a caller genuinely needs to choose namespaces dynamically. All namespaced capabilities take a `FileAccessContext` (`actorId`, `callerComponent`, optional `role`) so the gateway can check the namespace's cross-component allow-list (`"core"` is always permitted) in addition to per-object ACL.

### HTTP routes

- `PUT/GET/DELETE /api/v1/files/:namespace/*key` — generic namespace-scoped file operations; requires authentication, actor identity comes from the session.
- `GET /api/v1/files/:namespace` — list.
- `GET/PUT /api/v1/files/admin/namespace-defaults[/:namespaceId]`, `PUT /api/v1/files/admin/global-default`, `GET /api/v1/files/admin/users/:username/quotas`, `PUT /api/v1/files/admin/users/:username/quotas/:namespaceId` — admin-only quota administration (`namespaceId: "global"` addresses the user's global quota).

### Bootstrap ordering constraint

`GatewayService.bootstrap()` always bootstraps the files gateway before the database gateway. Consequently the files gateway cannot assume `db:executor` is available at its own bootstrap time — DB-backed schema creation (file object metadata, quota tables) is deferred to the first real call rather than performed eagerly.

## Configuration

| Variable         | Default      | Description                                                                               |
| ---------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Root directory for media storage; uploads go to `$MEDIA_LOCATION/uploads/<namespace>/...` |
