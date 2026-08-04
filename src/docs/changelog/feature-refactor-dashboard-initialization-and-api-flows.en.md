# Faster Dashboard Startup

## Dashboard cards now load independently

The dashboard finishes mounting immediately after rendering its base layout, while account details, upcoming events, and extensions continue loading independently, so an optional integration cannot leave navigation blocked.

## Upcoming events use one bounded request

A calendar gateway flow now projects accessible calendar events and invitations through one authenticated endpoint with the caller-requested limit.

## Calendar requests stay inside the Calendar gateway

The dashboard consumes the Calendar gateway's exported upcoming-events function, keeping endpoint and response details within the owning component.

## Authentication version reporting is consistent

Authentication runtime registration now reports the same version as its component manifest.
