# Reliable error popups during service interruptions

**Feature Branch:** feature-fix-error-popup-rendering-on-service-restart

## Error popups remain readable while Cognis restarts

Cognis now places the complete popup stylesheet in the browser's temporary Cache Storage while the service is responsive. If the server becomes temporarily unavailable during a restart, runtime error dialogs use that cached stylesheet instead of rendering as unstyled page content.

## Commits

- [dc87c30](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc87c30f1621b82081ff176cf15f2df337df3f14)
