# Stable divided scrolling

**Feature Branch:** feature-refactor-scroll-handling-for-overflow-pages

## Page composer document scrolling mode

The page composer now supports a document scrolling mode for divided layouts that should avoid nested vertical scroll containers. Pages can opt in when their content should grow naturally with the browser page while keeping existing scrollable toolbars available for long navigation menus.

## License page scrolling cleanup

The License page now delegates the license text to the main page scroll instead of stacking page, card, and content-panel scrollbars. Its navigation menu remains independently scrollable and sticky, making long legal text easier to read and navigate consistently.

## Commits

- [f3b64ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3b64ca116345d58e4240401d000eb9d83fadcb8)
