# Clock Lifecycle

**Feature Branch:** feature-clock-render-lifecycle

## Keep One Clock Per Display

Repeated dashboard redraws reuse the active clock. Replacing or hiding its display releases the old timer and listeners instead of updating detached content.

## Stop Updates on Navigation

Dashboard mount ownership follows navigation cancellation and replacement. Digital and analogue clocks retain their timezone, formatting, theme, accessibility and saved layout behavior.

## Commits

- [4fb4fe8819ae951c538f7f2f6b562fc68acf5065](https://github.com/Cognis-Labs-HQ/Cognis/commit/4fb4fe8819ae951c538f7f2f6b562fc68acf5065)
