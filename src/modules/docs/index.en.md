# Module Framework

## Overview

The Cognis module framework lets third-party and community developers extend the platform with new learning modes, integrations, and UI pages without modifying core. Modules are self-contained directories or archives that declare a `manifest.json`, register API routes, contribute UI pages, and optionally add CLI subcommands. Core modules (`class: "core"`) ship with the platform and cannot be toggled. Extension modules can be enabled, disabled, installed, and removed at runtime through the admin API or `cognisctl`.

## Responsibilities

- Discover and load module manifests from `COGNIS_MODULES_ROOT` (default `src/modules`).
- Expose `enable` and `disable` operations through the `ModuleRuntimeGateway` interface.
- Load each enabled module through its bootstrap entrypoint (`entrypoints.bootstrap`) and route all module features through bootstrap-injected ctx capabilities.
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
        bootstrap?: string;
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
    router.get(
        "/api/v1/modules/my-module/data",
        async (req, res) => {
            // handler
        },
        { access: { minRole: "moderator" } },
    );
    router.post(
        "/api/v1/modules/my-module/admin-audit",
        async (req, res) => {
            // handler
        },
        { access: { onlyRole: "owner" } },
    );
}
```

`createModuleExtensionRoutes` in `src/modules/routes/module-extensions.ts` loads each enabled module from `entrypoints.bootstrap` when present. The bootstrap receives a ctx object (`moduleId`, `moduleRoot`, `getCapability`, `router`, `registerApiGet`, `registerApiPost`, and UI registration methods) and is the only approved integration surface.

Direct cross-module or core-to-module imports are forbidden. Every capability exchange must flow through ctx.

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

| Method | Path                            | Description                                            | Auth   |
| ------ | ------------------------------- | ------------------------------------------------------ | ------ |
| `GET`  | `/api/v1/modules`               | List all installed modules with enabled/disabled state | Bearer |
| `POST` | `/api/v1/modules/:id/enable`    | Enable a module                                        | Admin  |
| `POST` | `/api/v1/modules/:id/disable`   | Disable a module                                       | Admin  |
| `POST` | `/api/v1/modules/install`       | Install a module from an uploaded archive              | Admin  |
| `POST` | `/api/v1/modules/import/github` | Import a module archive from a GitHub repository tag   | Admin  |

## GitHub Import Lifecycle

1. Admin submits `repositoryUrl` and `versionTag` via Administration UI or `cognisctl modules:import-github`.
2. API route `/api/v1/modules/import/github` validates inputs and delegates to `ModuleService.importFromGithub`.
3. Service downloads the GitHub tag archive from `codeload.github.com` and forwards bytes to the module runtime gateway.
4. Runtime installs the archive as a standard drop-in module directory that follows the required file contract below.
5. Admin enables the module through the normal `/enable` flow.

## Required Files for New Modules

Every runtime extension module must include:

- `manifest.json` (identity, capabilities, entrypoints, dependency metadata)
- `routes.json` (declared API/UI routes used for safety checks)
- `bootstrap.js` or `bootstrap.ts` (the single gateway that injects all module capabilities into ctx)
- `ui/` directory (static assets; required even when UI entrypoint is not exposed yet)

Recommended when relevant:

- `api/index.js` or `api/index.ts` (API route handlers used by bootstrap)
- `cli/index.js` (CLI command registration)
- `db/*.sql` (schema bootstrap/migrations)
- `docs/standard.<lang>.md` (module standards and operational notes)
