# Trim Long Docs Titles in UI

## Summary

- Truncated long documentation titles in the docs navigation UI.
- Limited rendered documentation headings to a 30-character visual width and preserved the full text as hover metadata for long headings.
- Loaded the dedicated docs stylesheet on the docs page and added coverage for the truncation behavior.

## Changed Files / Components

- `src/ui/app/docs/index.js`
- `src/ui/public/pages/docs.html`
- `src/ui/styles/docs.css`
- `src/ui/tests/docs-links.test.js`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/e8f614f1abf5a1453253da61913b2c38c07a897a
