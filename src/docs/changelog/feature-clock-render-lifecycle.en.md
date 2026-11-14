# Clock Lifecycle

**Feature Branch:** feature-clock-render-lifecycle

## Keep One Clock Per Display

Repeated dashboard redraws reuse the active clock. Replacing or hiding its display releases the old timer and listeners instead of updating detached content.

## Stop Updates on Navigation

Dashboard mount ownership follows navigation cancellation and replacement. Digital and analogue clocks retain their timezone, formatting, theme, accessibility and saved layout behavior.

## Commits

- [22b569dd5d1758c76f3af5fe770009fda517e9f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/22b569dd5d1758c76f3af5fe770009fda517e9f7)
