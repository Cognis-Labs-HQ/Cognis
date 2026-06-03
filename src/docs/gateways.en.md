# Gateway and Adapter

## Overview

A gateway is the sole authority for a bounded domain in Cognis. It owns the
schema, routes, capabilities, and adapters for that domain. The rest of the
platform never imports from gateway code directly — it consumes capabilities
from the shared `CapabilityStore` or calls the gateway's public interface.

Adapters are the concrete implementations that live under a gateway. They are
discovered and bootstrapped by their owning gateway at server startup. Neither
core nor the server knows which adapters are present.

This document covers how to build a new gateway, how to write adapters for an
existing gateway, and the contracts both must satisfy.

## Responsibilities

### Gateway

- Own a `manifest.json` declaring its identity and dependencies.
- Export a `bootstrap(ctx)` function that the server calls at startup.
- Register itself with the `GatewayRegistry` during bootstrap.
- Register its HTTP routes via `ctx.routeRegistry`.
- Contribute capabilities to `ctx.capabilities` for other gateways to consume.
- Discover and bootstrap its own adapters from `src/adapters/<gateway-id>/`.

Not responsible for: implementing route logic that belongs in an adapter, or
knowing anything about sibling gateways beyond the capabilities they expose.

### Adapter

- Export a `bootstrap<Domain>Adapter(ctx)` function (e.g.
  `bootstrapNotifyAdapter`, `bootstrapSocialAdapter`).
- Implement domain logic, schema setup, and route registration using the
  context provided by the owning gateway.
- Self-register with the gateway by calling the appropriate registration
  method on `ctx.gateway`.
- Never register itself with the `GatewayRegistry` directly — only the
  owning gateway does that.

Not responsible for: gateway lifecycle, capability store management beyond
its own contributions, or route registration outside its domain.

## Architecture

### Directory layout

```
src/gateways/<id>/
  manifest.json          — gateway identity and dependency declaration
  bootstrap.ts           — re-exports bootstrap from ./bootstrap/index.js
  bootstrap/
    index.ts             — orchestrates sub-files; exports bootstrap()
    routes.ts            — route-creation helpers (when bootstrap/ is used)
    ...                  — other focused sub-files
  gateway.ts             — CoreFooGateway class and adapter context interface
  routes/
    index.ts             — HTTP route handlers for this gateway
  docs/
    index.en.md          — gateway documentation (required)
    index.de.md
    index.ja.md
    index.id.md

src/adapters/<id>/<adapter-id>/
  package.json           — name, version, "main": "index.ts"
  index.ts               — orchestrator; re-exports public API
  docs/
    index.en.md          — adapter documentation (required)
    index.de.md
    index.ja.md
    index.id.md
  tests/                 — adapter unit tests
```

### File structure conventions

Every component must use an `index.ts` (or `index.js`) as its orchestrating entry point. This applies at every level of nesting: a gateway's `bootstrap/` directory has a `bootstrap/index.ts`; a gateway's `routes/` directory has a `routes/index.ts`; an adapter directory has an `index.ts`.

**Entry points are always `index.ts`.** Do not use filename prefixes derived from the parent directory: `src/adapters/notify/smtp/index.ts`, not `smtp-notification-sender.ts` as the main export surface. The directory name already provides context.

**Route files live in `routes/` subdirectories.** Never place a route file as a flat `routes.ts` or `<feature>-routes.ts` directly inside a component root. Route handler files must be `routes/index.ts` (or `routes/<sub-domain>/index.ts` for further splits) so the directory structure mirrors the URL hierarchy.

**Split large files with subdirectories.** When a file grows beyond approximately 400 lines, convert it into a directory: keep the original filename as a one-line barrel that re-exports from `./dirname/index.js`, place the implementation in `dirname/index.ts`, and extract logical sub-sections into focused sibling files within that directory. For example:

```
src/gateways/notify/
  bootstrap.ts            — 1 line: export { bootstrap } from "./bootstrap/index.js"
  bootstrap/
    index.ts              — bootstrap() function; imports from sibling files
    stores.ts             — store interfaces and initialisation helpers
    user-email-routes.ts  — createUserEmailRoutes()
    adapter-routes.ts     — createGatewayAdapterRoutes()
```

**Bootstrap directory additive pattern.** When multiple contributors must independently add items to a shared bootstrap surface, place each contribution in a dedicated sibling file under `bootstrap/` and have `bootstrap/index.ts` ingest all files in the directory automatically. This prevents PR collisions on a single registry file.

### manifest.json

Every gateway directory must contain a `manifest.json`:

```json
{
    "id": "notify",
    "name": "Notification Gateway",
    "version": "1.3.0",
    "description": "Pluggable notification dispatch.",
    "publisher": "Cognis Labs HQ",
    "required": false,
    "requires": ["db"],
    "hasAdapters": true
}
```

| Field         | Required | Description                                                        |
| ------------- | -------- | ------------------------------------------------------------------ |
| `id`          | Yes      | Unique identifier; matches the directory name                      |
| `name`        | Yes      | Human-readable display name                                        |
| `version`     | Yes      | Semantic version; bump on any code or schema change                |
| `description` | No       | One sentence shown in the admin UI                                 |
| `publisher`   | No       | Organisation or person responsible                                 |
| `required`    | No       | If `true`, the server refuses to start if bootstrap fails          |
| `requires`    | No       | IDs of gateways that must be present before this one initialises   |
| `hasAdapters` | No       | If `true`, the admin UI shows an adapters section for this gateway |

The `GatewayService` reads `manifest.json` to determine boot order and
dependency validation. It does not register the gateway — the `bootstrap(ctx)`
function is responsible for calling `ctx.gatewayRegistry.register(...)`.

### bootstrap.ts

The bootstrap file is the only entry point the server calls. For new or small gateways, it exports the `bootstrap` function directly. For gateways whose bootstrap logic exceeds approximately 400 lines, `bootstrap.ts` becomes a one-line re-export barrel and the implementation lives in a `bootstrap/` subdirectory:

```ts
// bootstrap.ts (barrel form — used when implementation is split)
export { bootstrap } from "./bootstrap/index.js";
```

```ts
// bootstrap/index.ts (or bootstrap.ts for small gateways)
import type { GatewayBootstrapContext } from "../shared.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    // 1. Read capabilities contributed by earlier gateways
    // 2. Instantiate your gateway class
    // 3. Bootstrap adapters
    // 4. Register routes
    // 5. Contribute capabilities
    // 6. Register with the gateway registry
    // 7. Register UI sections
}
```

`GatewayBootstrapContext` provides:

| Field             | Type              | Description                                                |
| ----------------- | ----------------- | ---------------------------------------------------------- |
| `gatewayRegistry` | `GatewayRegistry` | Call `.register(manifest)` to make the gateway visible     |
| `capabilities`    | `CapabilityStore` | `.get<T>(key)` to read; adapters use `.contribute(key, v)` |
| `routeRegistry`   | `RouteRegistry`   | `.register(handler, gatewayId?)` to add HTTP routes        |
| `uiRegistry`      | `UIRegistry`      | `.registerAdminSection(...)`, `.registerStaticDir(...)`    |
| `adaptersRoot`    | `string`          | Absolute path to `src/adapters/`                           |
| `log`             | `BootstrapLog?`   | Structured logger; available after the logging gateway     |

Register the gateway with the registry at the end of bootstrap so it only
appears in the admin UI after it has fully initialised:

```ts
ctx.gatewayRegistry.register({
    id: "notify",
    name: "Notification Gateway",
    version: "1.3.0",
    description: "Pluggable notification dispatch.",
    publisher: "Cognis Labs HQ",
    hasAdapters: true,
});
```

### The CoreGateway class

Define the gateway's runtime state and public interface in `gateway.ts`. This
keeps bootstrap logic separate from domain logic and gives adapters a typed
surface to call into:

```ts
// src/gateways/notify/gateway.ts
export interface NotificationGateway {
    registerSender(sender: NotificationSender): void;
    dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
}

export class CoreNotificationGateway implements NotificationGateway {
    private readonly senders = new Map<string, NotificationSender>();

    registerSender(sender: NotificationSender): void {
        this.senders.set(sender.id, sender);
    }

    async dispatch(envelope: NotificationEnvelope) {
        // ...
    }
}
```

### Adapter discovery

Gateways discover adapters by scanning `src/adapters/<gateway-id>/` and
dynamically importing each adapter's entry point. The pattern used by both
the notify and auth gateways:

```ts
for (const entry of entries) {
    const pkgPath = path.join(adaptersRoot, entry, "package.json");
    let mod: Record<string, unknown>;
    try {
        const raw = await readFile(pkgPath, "utf8");
        const pkg = JSON.parse(raw) as { main?: string };
        if (!pkg.main) continue;
        mod = await import(path.resolve(adaptersRoot, entry, pkg.main));
    } catch {
        continue;
    }
    if (typeof mod.bootstrapFooAdapter !== "function") continue;
    await (
        mod.bootstrapFooAdapter as (
            ctx: FooAdapterBootstrapCtx,
        ) => Promise<void>
    )(adapterCtx);
}
```

Wrap each per-adapter call in its own `try/catch` so a single failing adapter
does not prevent the gateway from registering. Log the error and continue:

```ts
try {
    await bootstrapFn(adapterCtx);
} catch (err) {
    ctx.log?.("error", `Adapter "${entry}" bootstrap failed — skipping.`, {
        component: "foo-gateway",
        adapter: entry,
        error: err instanceof Error ? err.message : String(err),
    });
}
```

Failing to do this means any adapter error propagates up through `bootstrap()`,
which the `GatewayService` catches silently — the gateway never registers.

### FooAdapterBootstrapCtx

Define the context interface in `gateway.ts` alongside `CoreFooGateway`. Model
it on the notify gateway's `NotifyAdapterBootstrapCtx`:

```ts
export interface FooAdapterBootstrapCtx {
    gateway: CoreFooGateway;
    adapterId: string;
    adapterRoot: string;
    capabilities: CapabilityStore;
    gatewayRegistry: GatewayRegistry;
    registerRoute(handler: RouteHandler, gatewayId?: string): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerNavbarPlugin?(scriptUrl: string): void;
    log?: BootstrapLog;
}
```

Always include `adapterId` and `adapterRoot` so the adapter knows its own
identity without hardcoding it.

### Writing an adapter

An adapter entry point exports a single async bootstrap function. At the end
of a successful bootstrap it self-registers with the gateway:

```ts
// src/adapters/notify/smtp/index.ts
import type { NotifyAdapterBootstrapCtx } from "../../../gateways/notify/gateway.js";

export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    const smtpHost = process.env.COGNIS_SMTP_HOST;
    if (!smtpHost) {
        ctx.log?.(
            "warn",
            "SMTP adapter: COGNIS_SMTP_HOST not set — skipping.",
            {
                component: "notify-smtp",
            },
        );
        return;
    }

    const sender = createSmtpSender(smtpHost, ctx.log);
    ctx.gateway.registerSender(sender);

    ctx.registerRoute(createSmtpRoutes(sender), "notify");
    ctx.log?.("info", "SMTP adapter bootstrapped.", {
        component: "notify-smtp",
    });
}
```

Key points:

- **Guard on required resources before using them.** If a dependency (DB
  executor, env var, capability) is absent, log a warning and `return` early
  rather than throwing. Throwing propagates through `bootstrapAdapters()` and
  prevents the gateway from registering.
- **Self-register last.** Only call `ctx.gateway.registerSender(...)` (or
  `ctx.gateway.registerAdapter(...)`) after all setup has succeeded. This way
  the gateway's adapter list reflects only fully-initialised adapters.
- **Import the context type from `gateway.ts`, not `bootstrap.ts`.** The
  context interface belongs to `gateway.ts` so adapters can import it without
  pulling in the full bootstrap dependency graph.

### Capability store

Use `ctx.capabilities` to share values between gateways without direct
imports. The DB gateway contributes `db:executor` and `db:type`; the logging
gateway contributes `logging:log`.

```ts
// Contribute (from a gateway or adapter bootstrap):
ctx.capabilities.contribute("notify:gateway", gateway);

// Consume (in a later gateway's bootstrap):
const notifyGateway =
    ctx.capabilities.get<NotificationGateway>("notify:gateway");
```

Capability keys follow the convention `<gateway-id>:<name>`.

### Boot order

Gateways are bootstrapped in this order:

1. `files` — contributes file I/O capability
2. `logging` — contributes `logging:log`; all subsequent gateways can use `ctx.log`
3. `db` — contributes `db:executor` and `db:type`
4. All remaining gateways — sorted alphabetically

If your gateway requires another (e.g. `"requires": ["db"]`), declare it in
`manifest.json`. The `GatewayService` validates the dependency graph after all
gateways have bootstrapped and logs a warning (or throws, for required
gateways) if a declared dependency is absent.

## Extension Points

To add a new adapter to an existing gateway:

1. Create `src/adapters/<gateway-id>/<adapter-id>/`.
2. Add `package.json` with `name`, `version`, and `main` pointing to the entry module.
3. Export `bootstrapFooAdapter(ctx: FooAdapterBootstrapCtx)` from that entry module.
4. Add `docs/index.en.md` (and DE/JA/ID variants) following the documentation standard.
5. Add tests under `tests/`.

The gateway discovers the adapter automatically on next server start — no
central registration is needed.

To add a new gateway:

1. Create `src/gateways/<id>/` with `manifest.json`, `bootstrap.ts`, and `gateway.ts`.
2. Add `docs/index.en.md` (and DE/JA/ID variants).
3. Add the gateway to `src/components/docs/versions.en.md`.
4. Add an entry to each language variant of `src/docs/index.<lang>.md` under the Gateways table.

The `GatewayService` discovers the gateway directory at startup — no import in
`server.ts` or `main.ts` is needed.
