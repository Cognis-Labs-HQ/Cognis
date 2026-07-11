# Share Utility

## Add a Share Gateway

Cognis now includes a dedicated Share gateway that owns public share-token minting, listing, revocation, and resolution. The gateway registers canonical share flows, persists share tokens in the DB, and exposes a public `/share/:token` page backed by the standard page composer with a minimal shell.

## Share Meetings

The Jitsi Meet module now contributes share flow hooks for meeting resources, exposes meeting-share management routes, and renders a share button in the meeting stage. Meeting owners can generate expiring share links, copy them from a popup, and revoke them later.

## Generic Share Links Popup

The share links popup has been extracted from the Jitsi Meet module into a generic `openShareLinksPopup` utility in `src/ui/reuse/share-links-popup.js`. It accepts API callback functions and label strings as parameters, making it reusable by any feature that needs to manage share links. The import now uses an absolute path, fixing a dynamic import fetch failure on the Meetings page.

## Fix Meetings Page Load Failure Caused by 401 on share-adapter.js

The static top-level import of `share-adapter.js` in the Meetings `app.js` was triggering
a 401 response at module parse time, before the user session could satisfy any auth check.
This aborted the import and prevented the entire `/meetings` SPA route from loading.
`share-adapter.js` is now fetched as a lazy dynamic import co-located with
`share-links-popup.js` inside the share button click handler, so it is never requested
until the user is in an authenticated session and deliberately opens the share popup.

## Remove Orphaned Jitsi Meet Files

The legacy `ui/app/index.js` and `ui/pages/meetings.html` files in the Jitsi Meet module were
orphaned by a prior refactor and never served to browsers. `index.js` contained a broken
import (`/static/reuse/page-composer.js` instead of `/static/reuse/page-composer/index.js`),
which would cause a load failure if the file were ever reached. Both files have been removed.

## Fix Calendar Invitation Test Date

The shared calendar event auto-invite test used a hardcoded event date (2026-06-16) that had
fallen in the past, causing `listInvitedPendingEvents` to filter it out and the assertion to fail.
The event date has been updated to 2030-06-16.

## Fix Public Share Links Blocked by Auth Check

The calendar gateway route handler used an overly broad `pathname.includes("/share")` check
that accidentally intercepted public share link URLs (`/share/shr_...`) and returned an
unauthorized error before the share gateway could serve the page. The check is now narrowed
to only match calendar-specific share API routes under `/api/v1/calendar/calendars/:id/share`.

## Fix Share Popup Label Input Focus

When the share-links popup opens, the label input field now receives focus automatically.
Previously, the close button (the first button in the popup DOM) was incorrectly focused,
preventing direct keyboard input into the label field.

## Client-Side Flow Architecture

A singleton `uiCtx` browser flow engine now powers all cross-cutting browser concerns. Auth, page loading, and SPA navigation are expressed as named, staged flows that any gateway or module can extend without owning. Session validation lives in the auth gateway, guest token swapping lives in the share gateway, and `page-entry.js` delegates to the `load-page` flow so individual pages no longer need to call auth helpers directly. The Jitsi Meet `share-mount.js` wrapper is deleted; the share page loads `app.js` directly and discovers share context through the flow system.

## Fix Login Redirect Loop

The `load-page` authentication hook now skips auth enforcement on public pages (`/login` and `/register`), preventing an infinite redirect loop that occurred because importing `createPageComposer` on those pages transitively registered the auth hook, which then immediately redirected unauthenticated visitors back to `/login`.

## Fix Share-Linked Meeting Page Errors

Several interrelated bugs caused errors and a blank page when joining a meeting (or loading any shared content) via a share link.

- **Guest tokens now pass server auth**: The auth guard was rejecting share-purpose tokens because `getAuthClaims` only accepted `purpose: "session"` tokens. It now also accepts `purpose: "share"` tokens, allowing guest JWTs to authenticate API calls to Jitsi Meet endpoints.

- **Prevent double-mount on dynamic import**: The share page imports the resource's mount script dynamically. The module's own top-level `mountWhenDirect` call was firing a second full `load-page` flow because `globalThis.__spaRouter` was not set on the share page. The share page now uses the same `__spaRouterCount`/`__spaRouter` guard as the SPA router to suppress this spurious execution.

- **Preserve guest token across repeated auth checks**: `validate-stored-token` was calling `clearStoredSession()` whenever no `cognis_account` was found — which wiped the guest access token set by the share hook. Now it only clears when no token at all is present; a token without an account (the guest scenario) is left intact for `apply-alternate-auth` to handle.

- **Remove dead `guestController` assignment**: The share session-flow-hooks had a stale line that assigned the `activateGuestToken` function to `guestController` without ever calling it; that dead assignment has been removed.

- **Page styles for shared content**: The Jitsi share hook now includes `stylesheetUrls` in the page descriptor. The share page loads these stylesheets (via `ensurePageStylesheet`) before mounting the shared resource, so the Jitsi meeting UI receives its required CSS.

## Share Buttons Hide Automatically for Guests

Any component that renders a share button now asks the Share gateway whether the current session is a share guest, and hides the button entirely for guests instead of just disabling its click handler. Share button creation is now owned exclusively by the Share gateway's own client module, so disabling the gateway means no share button is ever created.

## Share Windows Use the Full Logged-In Page Layout

Opening a share link now renders the standard topbar, footer, and full-size content grid used by logged-in pages, instead of a stripped-down branded frame. Login/register actions remain available to guests from the topbar.

## Guests Get a Temporary Per-Session Profile

Each guest session now gets a temporary display profile (name/avatar), automatically cleaned up after expiry. Jitsi Meet uses this temporary profile when informing Jitsi Meet of the guest's identity and when the guest sends a chatroom message.

## Guests Are Blocked from Navigating Away from the Share Link

If a guest tries to navigate to any other page, a popup explains that guests cannot view that page and returns them to the share link.

## Guests Only See Participants Who Allow It

Shared meetings now hide participants whose visibility preference excludes anonymous/guest viewers, both in the initial share payload and in live meeting state.

## Creating a Share Link Now Requires Approval from Other Participants

When a share link is requested for an entity with other users attached to it (e.g. a meeting), those users are prompted with an approve/decline popup. If anyone declines, the share link is not created. Popups auto-approve after 60 seconds if nobody responds.
