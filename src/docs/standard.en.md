# Documentation Writing Standard

## Overview

This document defines how documentation is written and organised in the Cognis codebase. Every gateway, adapter, module, and platform-level component ships its own documentation as Markdown files, discovered automatically by the docs route and served through the in-app documentation browser.

The goal is consistency: a contributor who reads any doc should immediately recognise the section structure, find what they need, and know how to write a new doc that fits the same pattern. Docs are written for developer contributors, not end users. Assume the reader understands HTTP, Node.js, and TypeScript.

Documentation lives alongside the code it describes. Gateway docs go in `src/gateways/<id>/docs/`, adapter docs go in `src/adapters/<gateway-id>/<adapter-id>/docs/`, and platform-level cross-cutting docs go in `src/docs/`. The docs route auto-discovers all `docs/` directories at startup so adding a new doc requires no central registration.

## Responsibilities

- Define the canonical section structure for all component documentation.
- Define file naming conventions and language requirements.
- Define depth tiers so authors know how detailed each doc should be.

Not responsible for: enforcing docs exist (that is a code review concern), automated spell checking, or link validation.

## Architecture

### Section structure

Every doc file is a Markdown file. Sections appear in this order; omit a section only when explicitly noted in the depth tier rules:

**1. `# Component Name`** — A clear H1 title. Use the full readable name of the component, not an identifier string (e.g. `# Authentication Gateway`, not `# auth`).

**2. `## Overview`** — Two to four paragraphs aimed at a developer new to the codebase. Explain what this component is, what problem it solves, and why it exists in Cognis. Avoid jargon; save technical details for Architecture. Example:

> The Authentication Gateway is the single point of entry for all login and identity operations in Cognis. It decouples the rest of the platform from any specific credential provider by sitting between route handlers and the concrete auth adapters. Adding a new identity provider — LDAP, SAML, or a custom in-house system — requires only a new adapter; no route handler needs to change.

**3. `## Responsibilities`** — A bullet list of what this component owns and is accountable for. Follow the list with a short note starting `Not responsible for:` that draws a clear boundary, e.g. `Not responsible for: storing user profile data (that is the profile gateway's concern)`.

**4. `## Architecture`** — Key design decisions, data flow, and key interfaces. Mix prose with file path citations like `src/gateways/auth/gateway.ts` and short code snippets showing key interfaces or type signatures where illuminating. This section should answer the question "how does it work at a high level?"

**5. `## Configuration`** — Environment variables or manifest fields an operator touches when deploying or configuring this component. Present as a table with columns `Variable | Default | Description`. Omit this section entirely if there is nothing an operator configures.

**6. `## Extension Points`** — How another contributor can extend or plug into this component: what interface to implement, what method registers the extension, what the lifecycle looks like. Omit if the component has no extension points.

**7. `## API Routes`** — A table of HTTP routes with columns `Method | Path | Description | Auth`. Include all routes registered by this component. Omit if the component registers no routes.

### Depth tiers

Different component types warrant different depth:

| Tier | Components | Required sections |
| ---- | ---------- | ----------------- |
| Platform / core | `src/docs/` platform docs | All sections fully |
| Gateway | `src/gateways/<id>/docs/` | Lighter Architecture; include Configuration + API Routes |
| Adapter | `src/adapters/<gw>/<id>/docs/` | Full standard (all applicable sections) |

### Code snippets

- Use two-space indentation in all code blocks.
- Use single quotes for TypeScript/JavaScript string literals.
- Do not add comments to code snippets unless they explain a non-obvious constraint.
- File path references use the repo-relative form: `src/gateways/auth/gateway.ts`.

### Tables

Use pipe syntax with a header separator row:

```
| Column A | Column B | Column C |
| -------- | -------- | -------- |
| value    | value    | value    |
```

## Configuration

This standard applies to all documentation in the Cognis repository. No runtime configuration is required.

## Extension Points

To add a new doc for a component:

1. Create a `docs/` subdirectory inside the component directory.
2. Add `index.en.md` as the primary English doc following the section structure above.
3. Add translations as `index.de.md`, `index.ja.md`, `index.id.md` with values in the target language.
4. The docs route discovers the file automatically at the next server start.

For platform-level docs that span multiple components, add `<name>.en.md` directly in `src/docs/` (e.g. `src/docs/acl-matrix.en.md`). These are served at the slug `<name>`.

### File naming

| Location | Primary file | Translation files |
| -------- | ------------ | ----------------- |
| Platform (`src/docs/`) | `<name>.en.md` | `<name>.de.md`, `<name>.ja.md`, `<name>.id.md` |
| Component (`docs/` subdir) | `index.en.md` | `index.de.md`, `index.ja.md`, `index.id.md` |

All four languages (en, de, ja, id) are required for any string visible in the UI. The docs browser falls back to `.en.md` when a translation is absent.

### Language requirements

Every string value in a translated doc must be written in the language that file represents. The only exceptions are brand names (`Cognis`), universal technical acronyms (`LDAP`, `TLS`, `STARTTLS`), format placeholders, and the Latin tagline (`Disce. Loquere. Vive.`).
