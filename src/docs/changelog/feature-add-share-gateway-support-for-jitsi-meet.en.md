# Shared component windows for guests

## Shared pages now auto-open synchronized component windows

Share guests can now receive component windows requested by mounted shared pages without a browser activation gesture. This lets meeting whiteboards and their synchronized peripheral behavior open for guests just as they do for signed-in Cognis participants, while the component-page broker continues to validate the requested host element and lifecycle signal.

## Integration boundary clarified

Component-window authorization does not grant access to a child component's APIs. Jitsi Meet must accept share guests on its whiteboard-state route and expose the meeting-to-whiteboard association, while Nextcloud Whiteboard must accept delegated access from that validated meeting share before synchronization can work end to end.

## Organizers can open synchronized meeting components

Signed-in organizers and other direct-access participants can now receive component-window requests while viewing an active shared resource. Opening a meeting whiteboard therefore mounts its component window and allows the meeting pane to transition to picture-in-picture even when synchronization makes the request after the original browser gesture.
