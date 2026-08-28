# Safer DOM parking

**Feature Branch:** feature-add-opt-in-flag-for-dom-parking

## DOM parking is now opt-in

The page composer now rebuilds page content by default, preventing parked DOM from masking user-updated data. Pages can explicitly enable parking for stateful media.

## Jitsi Meet retains its active session

The embedded Jitsi Meet page enables full DOM parking so its stateful iframe survives composer layout refreshes without reconnecting.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/44d57a98837df3d5ed38f8bd17413fa3e2a32904
