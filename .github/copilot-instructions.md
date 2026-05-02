# AI Instructions for Cognis

These instructions guide AI-assisted contributions to the Cognis codebase. Human contributor guidance is documented in-app alongside the relevant code.

---

## Architecture

### Route handlers must be thin and provider-agnostic
Route handlers should be unassuming about the details of any backing service or gateway. The goal is plug-and-play provider support: switching a provider (e.g. database, auth, file storage) should require only an environment variable change — the core codebase never knows the difference. All concrete interactions are encapsulated behind gateway/adapter abstractions.

- Never call a database driver, auth library, or external service directly from a route handler.
- Route handlers orchestrate; gateways/adapters execute.
- Apply this principle across all subsystems, not just the database layer.

### Adapter abstractions across subsystems
Prefer gateway/adapter abstractions at every seam where a concrete implementation might change. This extends beyond the DB layer to auth providers, file storage, queues, and any other pluggable subsystem.

### Module CLI controls
For module-specific operational controls, add pluggable CLI subcommands at `modules/<id>/cli/index.js`. Use `cognisctl` as the primary operational control surface.

### User namespace
Use the `user:*` command namespace for account operations (`create`, `role`, `set-password`, `disable`, `enable`, `delete`). Expose user preference resets only via `user:preferences:clear`; avoid granular per-key mutations.

### Shared UI logic
Reusable UI logic belongs in `ui/src/reuse`. Promote code reactively: when writing a new feature in area B, if you notice similar logic already exists in area A, move it to `reuse`, update area A to import it, and use it in area B. The threshold for promotion is any parameterisable snippet of 5 or more lines that provides distinct enough functionality to be worth a named function.

Every module in `ui/src/reuse` must open with a JSDoc block that documents: what the module does, its public exports with a one-line description each, a concrete usage example, and `@param` / `@returns` annotations on non-trivial exported functions. See `unsaved-changes.js` for the canonical form.

### UI app page structure
Each page entry point lives in its own subdirectory under `ui/src/app/` as `index.js`, alongside any sub-modules it owns. The directory name is the page name; sub-modules drop any shared prefix. For example:

```
app/
  settings/
    index.js          ← was settings.js
    font-prefs.js     ← was settings-font-prefs.js
    language-prefs.js ← was settings-language-prefs.js
  administration/
    index.js
  page-builder/
    index.js
  demo-puppeteer/
    index.js
```

Apply this layout to every new page and sub-module; never place a page entry point directly in `app/` as a flat `.js` file.

---

## Code quality

### Readability over terseness
Format all new or modified code for human readability. Do not compress logic, markup, or styles into dense one-liners when a multi-line structure is clearer. A statement that would naturally span 6+ lines in JavaScript should remain that way — humans must be able to eyeball the code meaningfully.

### Module cohesion
Keep modules focused and cohesive. Avoid duplicated request/serialization logic across routes and pages.

### Comments
Avoid speculative comments. Annotate only non-obvious technical constraints. Keep docs user/product-oriented; AI process guidance stays in this file.

Never let AI session reasoning, agent process notes, or session-specific observations enter the codebase — for example, remarks like "it was never changed", "queued; only written on Save", or "subsections ordered alphabetically" are agent artefacts and must be removed before committing.

Do not use section-indicator dividers (e.g. `/* ── Section name ─── */` or `// ── Section name ─── //`) in any file. These add noise without value.

Do not add any comments at all in CSS files. CSS is self-describing through its selectors and property names; inline or block annotations should not appear.

### Opportunistic improvement
When editing a file, make opportunistic improvements to the surrounding code that align with these principles — within the scope of the files being touched. Do not perform project-wide refactors as a side-effect of a targeted change.

---

## Testing

Before running unit tests, ensure the following prerequisites are met:

- `ripgrep` is installed (used by tooling scripts). Install with `apt-get install -y ripgrep` or equivalent for your platform.
- `npm install` has been run to ensure all dependencies are present.

Write unit tests that verify the API responds correctly under defined conditions, for example:

- An invalid or expired user token cannot make authenticated API calls.
- A disabled extension does not expose its routes via the API.
- A missing required field returns an appropriate error response.

Tests live alongside the code they cover. All new features require tests, logging, and documentation.

---

## Linting and formatting

Before running linting, ensure the following prerequisites are met:

- `ripgrep` is installed (used by tooling scripts). Install with `apt-get install -y ripgrep` or equivalent for your platform.
- `npm install` has been run to ensure all dependencies are present.

The project enforces readability via `src/tooling/scripts/lint-readable.mjs` (no tabs, no trailing whitespace) and `src/tooling/scripts/lint-placeholder.mjs`. Run `npm run lint` to check. All committed code must pass these checks.

Additional formal standards:
- Two-space indentation for JS/TS/HTML/CSS.
- Single quotes for string literals in JS/TS.
- Trailing comma on multi-line arrays and objects.
- Explicit return types on exported functions.
- No `any` in TypeScript except where unavoidable; document why when used.

---

## Security

API sanity and security are paramount.

- Validate and sanitise all user-supplied input at the boundary (route/gateway entry point).
- Enforce authentication and authorisation checks before any business logic executes.
- Never expose internal error details to API consumers; log them server-side.
- Do not introduce new dependencies without flagging them for review.

---

## Do not

- Do not delete or discard existing code without a clear and explicit reason. Prefer refactoring, deprecating, or commenting out with an explanation over silent removal.
- Do not change public API contracts (route signatures, exported types, CLI command names) without flagging the breaking change.
- Do not introduce new third-party dependencies without discussion.
- Do not perform speculative or cosmetic changes outside the files directly relevant to the task.
- Do not add AI process notes, agent reasoning, or session context to any product-facing documentation.


## i18n requirements
- Resolve all user-facing text via language keys from XML resources; do not hardcode UI copy in JS/HTML.
- Use `ui.reuse.generic.*` for standalone action words and common UI labels that are not feature-specific (e.g. `save`, `discard`, `reset`, `refresh`, `add`, `remove`, `done`, `enable`, `disable`, `id`, `version`, `class`, `actions`). Check for an existing `ui.reuse.generic.*` key before introducing a new app-specific one.
- Use shared `ui.reuse.*` keys for labels with meaningful context (section headings, menu items, named features). Reserve `ui.reuse.generic.*` strictly for context-free words usable in any feature area.
- Module-owned locale keys must be namespaced as `module.<moduleId>.*` and loaded without leaking into global namespaces.
- For docs, prefer language-suffixed markdown files (`*.en.md`, `*.es.md`) and resolve by language key first, then fallback.
