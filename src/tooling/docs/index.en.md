# Cognis Linting & Readability Standard

## Goals

- Keep code human-readable and consistently formatted.
- Prefer small, pure, reusable functions in `ui/reuse`.
- Keep rendering templates separate from behavior.

## Formatter

The canonical formatter is **Prettier 3.8.3** with the configuration at `.prettierrc`:

| Option          | Value   | Notes                                                 |
| --------------- | ------- | ----------------------------------------------------- |
| `tabWidth`      | `4`     | 4-space indentation across all file types             |
| `trailingComma` | `"all"` | Trailing comma in multi-line argument/parameter lists |
| `singleQuote`   | `false` | Double quotes for string literals (Prettier default)  |
| `printWidth`    | `80`    | Line-wrap threshold (Prettier default)                |

Run `npx prettier --write .` to apply formatting. The `npm run lint` command runs Prettier in check mode (via `lint-placeholder.mjs`) so any unformatted file will fail CI.

## Rules

1. 4-space indentation, semicolons required, double quotes for JS/TS strings.
2. One responsibility per module; extract shared logic into `reuse/`.
3. HTML structure lives in `ui/public/templates/*.html`; JS imports templates via loader utilities.
4. Page shells/layout guardrails live in `ui/layouts/`.
5. API routes should delegate business logic to services; avoid inline persistence logic.

## Lint command

- `npm run lint` runs Prettier format check across the repository, then a readability guard that fails on tabs and trailing whitespace for `api/`, `core/`, and `ui/` sources.
