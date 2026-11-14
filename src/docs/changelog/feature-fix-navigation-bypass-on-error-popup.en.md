# Error Popup Navigation

**Feature Branch:** feature-fix-navigation-bypass-on-error-popup

## Post-load crashes stay on the page

Closing the runtime error popup no longer navigates away from a page that had already loaded successfully before a button or other post-load action crashed. Route load and route mount failures still return users to the previous route when needed.

## Commits

- [dfb83b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfb83b1d6e8faa104500cf75a9856c8c7a210511)
