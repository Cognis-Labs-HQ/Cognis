# Clock Lifecycle

**Feature Branch:** feature-clock-render-lifecycle

## Keep One Clock Per Display

Repeated dashboard redraws reuse the active clock. Replacing or hiding its display releases the old timer and listeners instead of updating detached content.

## Stop Updates on Navigation

Dashboard mount ownership follows navigation cancellation and replacement. Digital and analogue clocks retain their timezone, formatting, theme, accessibility and saved layout behavior.

## Commits

- [8306134d322a6688d20ed5b64b68b9931b2de6ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/8306134d322a6688d20ed5b64b68b9931b2de6ae)
