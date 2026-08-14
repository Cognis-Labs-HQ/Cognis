# Share Popups Restored

## Consistent share popup

Whiteboards now open the Share gateway's drop-in popup with their resource identifier and capabilities, following the same gateway integration used by other components. The gateway remains responsible for share methods and token requests.

## Presence avatars stay in place

Page-presence profile images now receive their presentation from the shared presence stylesheet, so they remain toolbar avatars instead of rendering as unstyled image layers over the whiteboard canvas.

## Keep share guests authenticated

Opening a whiteboard share link now preserves its scoped guest session. Cognis no longer checks the temporary guest identity as a regular user account, clears its token, or reports that the account was deleted.

## Load guest-aware dashboard data

Shared pages now use the Share gateway's guest-session capability when choosing profile and dashboard requests, preventing irrelevant account-only requests from failing while a whiteboard is open.

## Protected shares keep their guest keyring

Shared pages now reuse one resolved guest session for their full lifecycle instead of resolving a new guest identity when a mounted component initializes. Guest keyrings remain session-only, retain protected meeting credentials, and no longer call account keyring or release-changelog APIs. Pointer-style controls are also removed during SPA navigation unless the destination page enables pointer tracking in its composer manifest. User-share notifications now open the canonical Share gateway page, and guest identities no longer run account validation or Social availability requests. Signed-in recipients of user-type shares now retain their account session and receive resource access through the Share gateway instead of being converted into guest identities. New user shares now send an internal, resource-specific destination containing the share record identifier rather than distributing the public guest URL. Content providers now pass only their normal internal content URL when opening Share; the Share gateway validates, stores, and delivers that URL while remaining the sole authority for recipient access. Public share URLs now resolve through the Share gateway and forward authorized viewers to the stored internal route; unavailable routes remain on the Share error page. Share tokens reference gateway-owned resource rows through a database foreign key. Active shares now move immediately to the Share access-denied view when a resource request reports revoked access. Share origins explicitly declare read-only support: meetings expose write access only, while whiteboards and calendars offer read and write choices, and read-only whiteboards load without attempting protected writes. Share guests now retain their resolved guest identity and internal share context while the router opens a whiteboard, so no profile handle is required. Read-only guests can publish and view pointer presence using read access, and leaving the whiteboard immediately stops its presence pollers and posts the inactive state. User-share notifications now return through the canonical Share URL so Calendar and Meetings can validate and deliver access before navigating to their Cognis content routes. Share recipients no longer see share controls, non-permission-aware share cards omit read/write wording, editing keeps the same permission vocabulary, and empty expiry updates no longer produce invalid PATCH requests. Meeting user-share recipients receive dynamic participant access only while their share remains valid; shared Meetings skip account-only startup requests, and Calendar share payloads mount without account-only profile loading.

## Fix Calendar event forms

Calendar event forms now load their HTML escaping dependency explicitly, preventing an `escapeHtml is not defined` error when opening or creating events.

## Refine shared Meeting access

Share dialogs now use a neutral Close action and a destructive Revoke action. User-shared Meetings retain the full page structure without exposing resharing controls, while denied link shares stop on the access screen instead of repeatedly reloading.

## Manage shares in one place

The User Menu now includes a Shares page for opening sent and received shares. Creators can manage or delete sent shares, recipients can reject received shares, and Cognis notifies affected users when shares are deleted, expire, or are rejected.

## Stop shared-page work when access ends

Whiteboard presence now stops immediately when a share is revoked and is fully detached during SPA navigation. Page action buttons use one CTX-managed dock so pointer, theme, and layout controls share consistent placement and can be added, updated, or removed with page lifecycle changes. Share dialogs always provide a Close label, and signed-in Meeting share recipients load the complete account page structure.

## Streamline the Shares overview

Sent and received shares now appear in one polished, responsive table with clear shared-to and shared-from details. Share titles open their content directly, while an icon-based Manage action opens the existing Share editor prefilled from the gateway database so owners can update recipients, permissions, names, expiration, and protection without leaving the Shares page.

## Prevent stale navigation and share status

Overlapping SPA navigations now cancel older route loads before they can mount. Expired shares are reported as inactive, and expiration notifications are marked complete only after every delivery succeeds so transient failures are logged and retried.

## One account context for guest sessions

Dashboard features now use the account context's shared guest-session capability instead of independently interpreting authentication storage.

## Align share actions

The Shares table now centers its Actions heading and keeps Manage, Copy, and Remove controls in consistent vertical columns across every row.

## Keep updated shares available

Changing a user share's permissions no longer invalidates the recipient's existing unlock. Unavailable share links now open the standard error page with a clear, localized explanation.

## Prepare participant-free meetings

Meeting-link guests now receive the meeting-specific Jitsi password through their scoped share session. A participant-free stage clearly explains that starting the meeting will show its link popup, while staged participants retain the existing readiness message.

## Load guest meeting chat cleanly

Meeting-link guests now use participant data already authorized by the meeting response instead of making forbidden room-metadata requests. Link Share also supplies its own localized email form labels so recipient and Send controls always render correctly.

## Stabilize guest meeting sessions

Guest meeting chat now uses the scoped share credential while retrieving its encrypted room key, and meeting-state polling safely ignores responses that finish after teardown. Email invitations place a meeting-specific recipient instruction above the address field.
