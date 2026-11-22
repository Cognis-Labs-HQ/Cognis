# Clock Lifecycle

**Feature Branch:** feature-clock-render-lifecycle

## Keep One Clock Per Display

Repeated dashboard redraws reuse the active clock. Replacing or hiding its display releases the old timer and listeners instead of updating detached content.

## Stop Updates on Navigation

Dashboard mount ownership follows navigation cancellation and replacement. Digital and analogue clocks retain their timezone, formatting, theme, accessibility and saved layout behavior.

## Commits

- [d317c4c675eb9e021a0cbf235052985a56b45eee](https://github.com/Cognis-Labs-HQ/Cognis/commit/d317c4c675eb9e021a0cbf235052985a56b45eee)
