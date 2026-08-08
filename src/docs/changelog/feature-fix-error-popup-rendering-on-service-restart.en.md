# Reliable error popups during service interruptions

## Error popups remain readable while Cognis restarts

Cognis now places the complete popup stylesheet in the browser's temporary Cache Storage while the service is responsive. If the server becomes temporarily unavailable during a restart, runtime error dialogs use that cached stylesheet instead of rendering as unstyled page content.
