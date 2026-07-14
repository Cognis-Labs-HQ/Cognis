# Whiteboard Session Reliability

## Session loading fixed

Whiteboard pages now load sessions correctly even when Share gateway capabilities are unavailable during route registration.

## Regression coverage

A targeted API route test verifies the session endpoint continues to return a usable room token for regular users without share capabilities.
