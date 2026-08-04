# Dashboard hydration follow-up

## Optional dashboard data no longer blocks navigation

The dashboard now finishes mounting immediately after its base layout renders, while account, calendar, and extension data continue loading independently.

## Calendar requests stay inside the Calendar gateway

The dashboard consumes the Calendar gateway's exported upcoming-events function, keeping endpoint and response details within the owning component.

## Authentication version reporting is consistent

Authentication runtime registration now reports the same version as its component manifest.
