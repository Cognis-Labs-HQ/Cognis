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

## Restore Legacy Jitsi Meet Page Files

The legacy `ui/app/index.js` and `ui/pages/meetings.html` files in the Jitsi Meet module are
kept in place for compatibility, with the page-composer import corrected to the current
folder-based entry point.

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

## Share Popup Refreshes Without Stealing Focus

The share-links popup now renders its create form and link list as separate DOM regions. The label and expiry inputs stay mounted while the list refreshes after create/delete actions and on a 10-second background poll, so users can keep typing without losing the caret position. Existing links also now expose the share URL itself as the copy button beside the title, reducing vertical clutter in the popup.

## Share Links Offer Email Quick Actions

Share records can now include gateway-resolved quick-share actions sourced from active notification senders. The SMTP adapter contributes a `mailto:` quick-share capability, and the Share gateway automatically adds an email action for active SMTP senders to each share record returned to clients.

## Fix Uncaught Profile Errors Breaking Meeting API Calls

Several Jitsi Meet routes (`meetings/active`, and every route built on `resolveMeetingPayloadOrReject`, including `get`, `preflight`, `probe`, `join`, `reclaim`, `presence`, the `auth-*` routes, `state`, and `chat-room-summary`) called `resolveRequesterUsername` without handling the error it throws when the caller has no visible profile handle. The uncaught exception was caught by the server's generic error handler and surfaced as an unhelpful `400 Bad Request` on every request, instead of the `409 profile_required` response already used by `meetings/create`. These call sites now handle the error consistently and return `409 profile_required`.

## Share Links Open Mail Client in a New Tab

The email quick-share action now opens `mailto:` links with `target="_blank"`, so composing a message no longer replaces the current tab with a blank navigation.

## Fixed Missing Email Icon in Share Popup

The mail icon asset now lives inside the Share gateway's own `ui/reuse` directory (self-contained with the rest of the gateway) instead of a generic public assets path, and is rendered as a themed mask icon that always matches the surrounding button color instead of an `<img>` whose internal `currentColor` never inherited the page theme.

## Guests See a Share Expired/Deleted Screen Instead of a Login Redirect

Visiting an expired, revoked, or otherwise unresolvable share link no longer force-redirects guests to `/login`. The `authenticate-session` flow now recognizes a failed share-token resolution and lets the share page render its own expired/deleted fallback screen.

## Share Link Label Clears After Creation

The custom label field in the share links popup is now cleared immediately after a link is successfully created, so creating another link starts from a blank label instead of reusing the previous one.

## Share Links Now Show Active/Expired Status and Expiry Time

Each share link in the popup now displays an "Active" or "Expired" status badge along with the local (user-timezone) date and time it expires or expired. Expired share tokens are now retained for a short grace period instead of being purged the instant they lapse, so owners can still see them listed as "Expired" before automatic cleanup removes them.

## Fixed Light-Mode Contrast in the Share Links Popup

Share link rows used a hardcoded dark background and text colors that ignored the active theme, making them render with an overly dark background even in light mode. The popup now uses the shared theme variables so it adapts correctly to both light and dark mode.

## Fix Expired Share Pages Hanging on an Infinite Loading Wheel

Visiting an expired or invalid share link caused the page to spin forever instead of showing the expired-link screen. `renderDashboardLayout` always assumed a failed session check meant a redirect was imminent and hung intentionally to avoid a content flash, but share pages call the same session check and, on a failed share resolution, deliberately get no redirect so they can render their own fallback. A new `requireAccountSession` composer option (defaulting to the previous behavior everywhere) lets the share page opt out of the hang so its own expired/deleted screen can render.

## Fix Missing Boilerplate CSS on Shared Meeting Pages

Meeting pages mounted inside a share link were rendering squeezed into a small default-sized card instead of the full page layout. The share page's mounted-app grid size used `max: ["full", "full"]`, which is not a recognized token in the page composer (only the scalar `max: "full"` flips full-width layout) and silently fell back to the small default card. The share element's grid size is now `max: "full"` for mounted apps, and the Jitsi Meet page's own inner composer now also receives `frameless: true` when rendering inside a share view, matching its outer share-page composer instead of keeping its normal card-styled padding.

## Fix Guest Meeting Chat Access

Guests joining a meeting via a share link were being blocked from the meeting chat. Two root causes were fixed:

- **Meetings created without other participants never got a chat room.** Meetings are commonly created solo and shared out afterwards, but chat room creation required at least two real accounts. The chat-room resolution capability now accepts an `allowSingleMember` option, and meeting creation uses it so solo-hosted meetings still get a chat room guests can access.
- **Share links minted before a meeting's first instance always failed as "expired".** The share access check required the link's recorded meeting-instance id to exactly match the meeting's current instance id, but a link shared ahead of time has no instance id yet. The check now only rejects a link when both the link and the meeting have a concrete, differing instance id (i.e. the meeting was restarted since the link was created).

## Share Link Copy Icon Uses Shared Clipboard Helper

The clipboard-copy helper previously duplicated inside the runtime error popup has been promoted to a generic `copyTextToClipboard` utility in `src/ui/reuse/clipboard.js`, and the share links popup's copy-link icon and auto-copy-on-create action now both use it instead of calling `navigator.clipboard.writeText` directly, so a missing/blocked Clipboard API degrades to a toast error instead of a silent failure.

## Guest View No Longer Shows the Participant Search Panel

The Jitsi Meet page's participant search / active-meetings panel was always included in the page layout, even for guests joining through a share link, who have no account and cannot use it. The panel is now omitted entirely when the page is rendered in share/guest view, instead of just being hidden behind guarded rendering.

## Share Links List Now Reflects a Restarted Meeting's Expiry

The share links popup listed links from a prior meeting instance as "Active" even though guests using them were already rejected as expired by the access check, because the list endpoint only looked at each token's expiry time and never compared its recorded meeting-instance id against the meeting's current one. The share gateway now exposes each token's stored metadata, and the meeting share list remaps any link whose recorded instance id no longer matches the meeting's current instance to "Expired", so hosts and participants see accurate status instead of a live-looking dead link.
