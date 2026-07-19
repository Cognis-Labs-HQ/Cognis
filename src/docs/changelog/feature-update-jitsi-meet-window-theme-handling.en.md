# Jitsi Theme Sync

## Immediate Jitsi Meet theme updates

The Jitsi Meet window now receives the active app theme directly whenever the app theme changes, so switching between light and dark mode updates the embedded meeting immediately instead of waiting on persisted theme state.

## Embedded Jitsi surfaces follow theme

The meeting embed now reapplies Cognis light and dark colors to the Jitsi iframe shell, toolbar, participant filmstrip, and participant cards when the meeting loads and when the app theme changes.

## Theme changes rebuild stale embeds

When the active Cognis theme changes during a live meeting, the embed refreshes the Jitsi window with the new interface configuration so deployments that ignore live `preferredTheme` updates still pick up the correct theme.
