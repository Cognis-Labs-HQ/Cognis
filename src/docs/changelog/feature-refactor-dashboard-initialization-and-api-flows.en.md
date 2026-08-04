# Faster Dashboard Startup

## Dashboard cards now load independently

The dashboard renders its base layout immediately and hydrates account details, upcoming events, and extensions concurrently, so an optional integration failure no longer blocks the usable page.

## Upcoming events use one bounded request

A calendar gateway flow now projects accessible calendar events and invitations through one authenticated endpoint with the caller-requested limit.
