# Safer DOM parking

## DOM parking is now opt-in

The page composer now rebuilds page content by default, preventing parked DOM from masking user-updated data. Pages can explicitly enable parking for stateful media.

## Jitsi Meet retains its active session

The embedded Jitsi Meet page enables full DOM parking so its stateful iframe survives composer layout refreshes without reconnecting.
