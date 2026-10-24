# Shared component windows for guests

**Feature Branch:** feature-add-share-gateway-support-for-jitsi-meet

## Shared pages now auto-open synchronized component windows

Share guests can now receive component windows requested by mounted shared pages without a browser activation gesture. This lets meeting whiteboards and their synchronized peripheral behavior open for guests just as they do for signed-in Cognis participants, while the component-page broker continues to validate the requested host element and lifecycle signal.

## Integration boundary clarified

Component-window authorization does not grant access to a child component's APIs. Cognis now resolves delegated guest access through a resource-neutral Share flow. The component that owns the original shared resource proves its relationship to the requested target and declares the allowed target capabilities; the target component consumes only the generic Share capability.

## Organizers can open synchronized meeting components

Signed-in organizers and other direct-access participants can now receive component-window requests while viewing an active shared resource. Opening a meeting whiteboard therefore mounts its component window and allows the meeting pane to transition to picture-in-picture even when synchronization makes the request after the original browser gesture.

## Guest component routes load after authentication

The Share page now refreshes SPA route discovery after guest authentication. Whiteboard component routes that were unavailable during the anonymous page bootstrap are therefore resolved with the active guest session, allowing the synchronized whiteboard window to mount inside the meeting.

## Guest context reaches embedded whiteboards

Cognis now carries the active Share context through the component-page flow into guest component mounts. The embedded whiteboard can recognize the delegated meeting share, retain guest authentication, and load the synchronized board instead of entering its account-only path.

## Delegated access is resource-neutral

The Share gateway now exposes `share:resolveDelegatedAccess` and owns validation of a guest token’s source scope. Resource owners extend the generic delegation flow to prove relationships without coupling target components to a meeting provider or any other named integration.

## Anonymous pages avoid account verification

Anonymous and Share guest initialization no longer sends the account-only password-confirmation invalidation request while keyring state is being prepared. This removes the unrelated `401` response from meeting link-share loading without weakening account confirmation expiry.

## Guest route refreshes ignore stale requests

Route discovery now discards anonymous responses that finish after a share guest session becomes active, ensuring synchronized component windows resolve with the guest's authorized routes.

## Commits

- [18e37476](https://github.com/Cognis-Labs-HQ/Cognis/commit/18e37476)
- [689801d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/689801d5)
