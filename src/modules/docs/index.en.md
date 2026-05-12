# Module Framework

## Overview

The Cognis module framework lets third-party and community developers extend the platform with new learning modes, integrations, and UI pages without modifying core. Modules are self-contained directories or archives that declare a `manifest.json`, register API routes, contribute UI pages, and optionally add CLI subcommands. Core modules (`class: "core"`) ship with the platform and cannot be toggled. Extension modules can be enabled, disabled, installed, and removed at runtime through the admin API or `cognisctl`.

## Responsibilities

- Discover and load module manifests from `COGNIS_MODULES_ROOT` (default `src/modules`).
- Expose `enable` and `disable` operations through the `ModuleRuntimeGateway` interface.
- Dynamically import API route plugins from each enabled module's `entrypoints.api` file.
- Block module routes from overriding protected system prefixes.
- Refresh registered module routes when modules are enabled or disabled.

Not responsible for: providing module-level data persistence (modules use the `db:executor` capability), or rendering module UI pages (modules supply their own HTML entry points via `entrypoints.ui`).

## Architecture

### Module discovery

At startup, `ModuleService` scans `COGNIS_MODULES_ROOT` for directories containing a `manifest.json`. Each valid manifest is parsed into a `ModuleManifest` object.

**nginx-style enablement:** An enabled module is indicated by a `.load` pointer file at `{modulesRoot}/{moduleId}.load`. Creating the file enables the module; removing it disables the module. This mirrors nginx's `sites-enabled` symlink pattern and means enabling/disabling a module is a filesystem operation that survives process restarts.

### Internal vs external modules

| Type       | Source                                         | Installation                           | Disclaimer                |
| ---------- | ---------------------------------------------- | -------------------------------------- | ------------------------- |
| `internal` | Bundled in the repository under `src/modules/` | Pre-installed                          | None                      |
| `external` | Uploaded `.zip` or `.tar.gz` archive           | Via admin API or `modules:install` CLI | Displayed before enabling |

External modules are installed by uploading a compressed archive. The framework extracts the archive, verifies its `manifest.json`, and places the module directory under `COGNIS_MODULES_ROOT`.

### ModuleManifest contract

```ts
export interface ModuleManifest {
    id: string;
    name: string;
    version: string;
    publisher?: string;
    class: "core" | "extension";
    coreApiVersion: string;
    capabilities: string[];
    requires?: string[];
    entrypoints: {
        api?: string;
        ui?: string;
        cli?: string;
        db?: string;
    };
}
```

`class: 'core'` modules cannot be disabled through the API. `requires` lists gateway IDs that must be active for the module to function; the admin UI prompts to enable any disabled dependency before the module is enabled.

### Frontend contract

Modules that supply `entrypoints.ui` must export their page at the declared path relative to the module directory. The platform injects the standard `<script src="/ui/main.js">` and `<link rel="stylesheet" href="/ui/styles.css">` and the module page renders in the shared shell.

### API route registration

```ts
export function registerApiRoutes(router) {
    router.get("/api/v1/modules/my-module/data", async (req, res) => {
        // handler
    }, { access: { minRole: "moderator" } });
    router.post("/api/v1/modules/my-module/admin-audit", async (req, res) => {
        // handler
    }, { access: { onlyRole: "owner" } });
}
```

`createModuleExtensionRoutes` in `src/modules/routes/module-extensions.ts` calls `registerApiRoutes` for every enabled module that declares `entrypoints.api`. Routes are reloaded on every enable/disable cycle via `refresh()`.

Each module route can declare optional access policy metadata through the third
router argument:

- `access.minRole` — allows the target role and every higher role
  (`user < teacher < moderator < admin < owner`)
- `access.onlyRole` — allows exactly one role group

### Protected route prefixes

Module routes must not start with any of the following prefixes:

| Prefix           | Reason                 |
| ---------------- | ---------------------- |
| `/api/v1/system` | Core system endpoints  |
| `/api/v1/auth`   | Auth gateway           |
| `/api/v1/users`  | User management        |
| `/public`        | Platform static assets |
| `/ui`            | Platform UI assets     |

Attempting to register a route under a protected prefix blocks module enablement.

`routes.json` supports either plain route strings or route objects with access
policy metadata for UI pages:

```json
[
  "/api/v1/modules/my-module/data",
  { "path": "/my-module/page", "access": { "minRole": "admin" } },
  { "path": "/my-module/owner-audit", "access": { "onlyRole": "owner" } }
]
```

## Configuration

| Variable              | Default                           | Description                                 |
| --------------------- | --------------------------------- | ------------------------------------------- |
| `COGNIS_MODULES_ROOT` | `src/modules` (resolved from cwd) | Directory scanned for module subdirectories |

## API Routes

| Method | Path                          | Description                                            | Auth   |
| ------ | ----------------------------- | ------------------------------------------------------ | ------ |
| `GET`  | `/api/v1/modules`             | List all installed modules with enabled/disabled state | Bearer |
| `POST` | `/api/v1/modules/:id/enable`  | Enable a module                                        | Admin  |
| `POST` | `/api/v1/modules/:id/disable` | Disable a module                                       | Admin  |
| `POST` | `/api/v1/modules/install`     | Install a module from an uploaded archive              | Admin  |
