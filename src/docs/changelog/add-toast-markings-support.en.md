# Toast Icons in Light Mode

**Feature Branch:** copilot/add-toast-markings-support

## Summary

Fixed toast notification icons (error ✕, success ✓, warning ⚠, info ℹ) being invisible in light mode. In light mode the `--color-danger-text` and `--color-success-text` variables resolve to `#fff` (white on white background), causing the markings to disappear. Light-mode overrides now use the outline-text colour tokens so icons remain clearly visible against the near-white toast surface.

## Changed Files / Components

- `src/ui/styles/reuse/toast.css` — added `body[data-theme="light"]` rules overriding icon colours for error, success, and warning toast variants.
- `src/ui/styles/reuse/theme.css` — added `--color-danger-outline-text` and `--color-success-outline-text` to `:root` (dark-mode values) so the tokens are always defined and the light-mode overrides simply redefine them.

## Commit Links

- [1305bfc](https://github.com/Cognis-Labs-HQ/Cognis/commit/1305bfc163422709964268baafe8b0036c7b5c10)
