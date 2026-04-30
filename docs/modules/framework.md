# Module Frontend Framework

## Goals
External modules must be able to contribute CSS, HTML templates, and JS behavior without patching core pages.

## Contract
Each module ships a manifest with frontend assets:

```json
{
  "id": "attendance",
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
