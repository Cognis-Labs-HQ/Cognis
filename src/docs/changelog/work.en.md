# Jitsi Theme Fix

## Embedded Jitsi surfaces follow theme

The meeting embed now reapplies Cognis light and dark colors to the Jitsi iframe shell, toolbar, participant filmstrip, and participant cards when the meeting loads and when the app theme changes.

## Theme changes rebuild stale embeds

When the active Cognis theme changes during a live meeting, the embed refreshes the Jitsi window with the new interface configuration so deployments that ignore live `preferredTheme` updates still pick up the correct theme.
