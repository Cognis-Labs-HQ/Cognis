# Module Frontend Framework

## Goals
External modules must be able to contribute CSS, HTML templates, and JS behavior without patching core pages.

## Nginx-style module enablement
Cognis now follows an nginx-like convention:

1. Module artifacts are discovered from a search path (`internal` then `external`).
2. Enabling writes a pointer file: `<enabled-pointers>/<moduleId>.load`.
3. The pointer targets either:
   - trusted internal unpacked directory, or
   - temporary runtime extraction directory for external archives.

## Module source conventions
- **Internal modules**: unpacked directories; trusted by default.
- **External modules**: must be `.zip` or `.tar.gz` files under `MODULES_PATH` (default `/app/modules/external`).
- External modules require explicit disclaimer acknowledgement before `enable` succeeds.

## Contract
Each module ships a manifest with frontend assets:

```json
{
  "id": "attendance",
  "publisher": "Example Corp",
  "frontend": {
    "styles": ["/modules/attendance/styles.css"],
    "templates": ["/modules/attendance/panel.html"],
    "scripts": ["/modules/attendance/index.js"]
  }
}
```

## Loader sequence
1. Resolve module manifest list from API.
2. Append `<link rel="stylesheet">` for module styles.
3. Fetch templates and register in template cache.
4. Import scripts as ESM and call `mount(context)`.

## Guardrails
- Module CSS should use prefixed classes (`.mod-<id>-*`).
- Module HTML should render inside layout slots, not replace page shell.
- Module JS should only call public API helpers in `ui/src/reuse`.
- Module route definitions (e.g. `routes.json`) are sanity checked to block collisions with protected prefixes (`/api/v1/system`, `/api/v1/auth`, `/api/v1/users`, `/public`, `/ui`).
- Module files are loaded from module-owned directories, not copied into trusted core paths such as `ui/public`.


## Metadata
- Modules should include `publisher` in manifest metadata so admin tooling can surface ownership details.
