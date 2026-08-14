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

## Enable disposable guest meetings

Messages now delegates external room authorization through a neutral capability supplied by the meeting owner, allowing scoped guests to unlock and use meeting chat. Meetings created without staged participants delete their meeting record and associated shares when they close.

## Route unavailable shares to errors

Deleted, expired, malformed, and nonexistent share links now leave the loading screen and open the public native error page with a localized share-specific description and the appropriate 404 or 410 status code.

## Isolated guest sessions and meeting chat authorization

Authentication now owns guest-session classification, share delivery no longer branches on calendar internals, and meeting chat access is registered through the Messages adapter's extension surface.

## Keep share navigation and recipient searches current

Account-share resolution now stops when the user navigates away, preventing a delayed request from replacing the destination page. Recipient APIs return every match, while the share picker truncates its own display results.

## Split oversized share and page modules

Large Share, Calendar, Whiteboard, and page-composer files are now divided into focused rendering, access, persistence, route-finalization, history, overlay, and DOM modules to keep every source file below the project limit.

## Store toolbar icons as reusable assets

The page-composer toolbar now loads its menu and close icons from reusable SVG asset files instead of embedding SVG markup in JavaScript.

## Restore protected user-shared calendars from the keyring

Calendar now delegates protected-share secret retrieval entirely to the Share gateway, which reads the canonical share password from the keyring without opening a prompt during background work and prompts during an explicit calendar load when needed. Successful validation creates the account-scoped server unlock grant, while locked shared events remain excluded from adjacent summaries. Meeting and whiteboard account shares continue to use the same Share-owned account unlock grant before their content loads.

## Keep received calendar events visible

Account-bound calendar shares now reconcile from their adapter-owned share method whenever calendar state or upcoming-event summaries load. Shared events are projected into the recipient's persistent calendar and adjacent summaries without requiring the recipient to reopen the share from Shares.

## Isolate account shares from guest sessions

Account-bound user shares now use a dedicated authenticated delivery page that never imports the public-link guest-session bootstrap. Their password prompt omits public-share Cognis branding, while public link shares retain their guest lifecycle and branded prompt.

## Revoke active shares and keep guest chrome scoped

Share deletion now publishes a revocation event to active tabs and signed-in recipients receiving the removal notification, immediately returning affected viewers to the denied share screen. Duplicate delete confirmations are suppressed, guest sessions no longer receive release summaries, and opening another share restores any stashed account session before deciding whether the requester is its owner.

## Make share ownership and overview controls deterministic

Share owners now bypass share-password challenges and proceed directly to their content URL under their account session, while recipients still complete any configured share authentication. The gateway-owned Shares page now rerenders filtered and optimistically removed rows explicitly, uses compact content-sized leading columns, and gives action controls consistent padded dimensions.

## Bind share authentication to the requested SPA route

The router now supplies the exact destination path to session authentication, and the Share gateway extracts the user-share token from that immutable route input. Concurrent URL changes can no longer make a valid user share appear to have no token or leave its recipient in the public loading shell.

## Keep account authentication on share resolution requests

Share resolution now uses the authenticated API client, which always attaches the signed-in account token while preserving share-password headers. Expected password challenges are isolated from global access-denied handling, so they no longer trigger guest-session redirects or duplicate unlock flows.

## Register destination share authentication before SPA checks

SPA navigation now loads the destination entry's flow contributions before authenticating the route. User-share recipients are therefore resolved by the Share gateway during the router's single authentication pass and retain their full account session instead of falling into the guest page.

## Reuse the router-resolved account share

The Share page now consumes the authenticated share context already resolved by SPA navigation instead of running authentication a second time. User shares therefore retain their direct account classification and proceed to the full destination page without being reinterpreted as guest access.

## Keep direct recipients in their account view

A server-verified direct user share now always builds an account session, even when the local validation stage did not return account metadata. It can no longer fall through into guest presentation. Deleted and rejected shares are also removed directly from the visible table before the request completes.

## Resolve user shares in one flow

User-share clicks now navigate to the Share page without pre-resolving the token in a second client path. The session flow owns account validation, password prompting, and delivery once, while deleted rows disappear optimistically and are restored only if the server rejects deletion.

## Repair share database updates

Share access timestamps, share edits, and expiration notification claims now use the database gateway’s supported update contract. This removes the null-object error that interrupted valid share resolution.

## Keep share access auditing from blocking content

Share resolution no longer fails when recording its optional last-access timestamp encounters an older or temporarily unavailable database column. Shares that have not been opened now say Not accessed instead of Never expires.

## Clarify successful shares and expose access dates

A destination-page failure after a user share has already been verified no longer reports that share as invalid or expired. Shares now show creation and last-accessed dates, and Whiteboard permission choices consistently use Read-Only and Read + Write.

## Finish protected share navigation and calendar guest controls

Notification actions are now claimed by only one share handler, preventing duplicate password prompts and false invalid-share errors. Calendar recipients acknowledge imports, received-calendar deletion uses applicable wording, and calendar guests can navigate views with current-time auto-scrolling. Share permissions now label write access as Read + Write.

## Continue protected user shares without resolving twice

After an intended recipient unlocks a password-protected user share, the verified result now carries across the following in-app navigation. Cognis no longer repeats the resolve request without its password, so the full account page opens instead of ending with a 401 error and an invalid-share notice.

## Open account shares directly

User-share links on the Shares page and in notifications now resolve once through the authenticated account path and navigate straight to the full destination page. They no longer pass through the guest landing page or activate guest-restricted presentation.

## Keep user shares account-only

Shares addressed to Cognis users can no longer mint or activate guest sessions. Only the explicitly named authenticated recipient or the share owner can resolve them; public link shares remain the sole guest-access mechanism.

## Make editing and protected user shares predictable

Share updates now contain only concrete changes, switching share methods exits edit mode, and the Shares page sizes itself to its table. Password-protected user-share notifications prompt once and may save the verified password to the intended recipient's keyring, while public link shares remain isolated from account keyrings.

## Simplify authenticated and guest share behavior

User-share notifications retain the designated account session, while password-protected public links prompt without unlocking or saving into an account keyring before entering guest mode. Empty update fields preserve existing values, and module-owned share dialogs now consistently use the corrected password and deletion wording.

## Secure user shares and clarify sharing controls

User shares continue to require the designated account instead of creating transferable guest access. Share actions now use neutral styling, permission choices clearly distinguish Read-Only from Read & Write, password dialogs provide concise recipient guidance, and removed guest shares exit cleanly without repeated redirects or notices.

## Restore share updates and seamless page transitions

The focused share editor now submits expiration changes consistently and presents its update action with the standard confirm treatment. In-app navigation keeps the current page styled until the destination has fully mounted, preventing flashes of unstyled outgoing content.

## Filter and remove shares immediately

The Total, Sent, and Received summary pills now filter the Shares table. Successfully rejected or deleted shares disappear immediately, and each destructive row action uses the standard cancel treatment without competing button classes.

## Preserve account access through owned and received shares

Opening a Whiteboard share as its creator or a Meeting user share as its recipient now keeps the authenticated account session during in-app navigation as well as after a refresh. The destination mounts its full account page, retains complete navigation, and no longer enters the restricted guest experience.

## Keep destination page controls and styles isolated

Whiteboard and Share pages keep layout editing disabled. Each in-app navigation now rebuilds the page action dock, discards actions not contributed by the destination, loads its complete stylesheet bundle, and removes route styles that no longer apply.

## Focus management on one share

The Shares page now opens a compact editor containing only the selected share's form. It keeps the share method fixed, updates only that database record, and no longer opens twice during client-side navigation.

## Align share controls

The Shares page no longer adds vertical space outside its card, and share buttons consistently use the cancel treatment for their potentially access-reducing action.

## Restore shared content routes

Registered gateway and module pages now load their own dashboard entry point and complete stylesheet bundle on a browser refresh as well as during in-app navigation. Shares, Meetings, and Whiteboards therefore retain their top bar, footer, layout, and component styling.

## Keep Meeting shares valid for their configured lifetime

Meeting shares now remain resolvable across meeting instances and ended sessions. Access continues until the share itself expires, is rejected, or is revoked, while repeated authentication flows reuse the already resolved share session.

## User shares stay in account sessions

Direct user shares now deliver the content provider’s opaque destination to the named recipient and never expose a public share URL or mint a guest session. Link shares retain their independent public-link and guest-access lifecycle.

## Enforce live share access

Incorrect share passwords now show an error and can be retried immediately. Protected user shares unlock before opening, Shares-page entries use the same access gate as notifications, and revoked link or user shares promptly remove recipients from active content.

## Stabilize share entry actions

Unprotected user-share notifications open their content directly, protected entries consume their one-time Shares-page action before prompting, and successful unlocks navigate using the internal app route. Duplicate user-share submissions now report the conflict or update the existing share when its settings changed.

## Keep long-lived tabs responsive

Share revocation checks now use one visibility-aware monitor instead of repeated half-second polling. Background tabs pause network checks and validate immediately when focused again, preventing long-running share pages from exhausting browser or server resources.

## Reuse saved share passwords

Password-protected user shares now store and retrieve their password using the same stable `share:<share-id>` keyring identifier, so opening the share again does not prompt after the password has been saved.

## Suspend hidden Whiteboards

Whiteboard presence polling and realtime sockets now suspend while their tab is hidden and resume with a fresh connection when it becomes visible. Collaboration script loading also times out cleanly, preventing stalled external requests from leaving reloads spinning indefinitely.

## Request keyring access only when needed

SPA navigation no longer unlocks the keyring speculatively. Account shares first check whether access requires a password and request keyring access only for that protected share, with the Shares access purpose and share identifier shown in the prompt.

## Prompt for keyring access only on demand

The Keyring settings contribution no longer schedules an unlock request when it renders, so loading the Dashboard or navigating between pages cannot trigger a generic prompt. Protected-share password dialogs now offer keyring storage only after a contextual keyring unlock succeeds.

## Bound background work and stalled requests

Availability polling now pauses in hidden tabs and coalesces overlapping refresh and heartbeat requests. Node and Nginx terminate stalled HTTP work, PostgreSQL applies a finite statement timeout, and MariaDB bounds its waiting query queue so an unhealthy dependency cannot accumulate work until the page or service becomes unresponsive.

## Stop presence traffic when pages become inactive

Presence trackers now wind down with adaptive polling and stop all recurring requests when the user becomes idle, the window loses focus, or the tab is hidden. Whiteboard composers bind teardown to their own navigation signal so SPA navigation immediately removes presence, pointer, canvas, and realtime hooks without affecting a later mount.

## Keep owner access passwordless and bound pending browser requests

The authenticated owner of an account-delivered user share can now resolve their own share without re-entering its recipient password; the owner account token remains the authority instead of copying the password into the keyring. Browser API and localization requests now have finite deadlines, concurrent localization and presence requests are coalesced, and navigation teardown aborts the remaining in-flight presence work.

## Reduce active Whiteboard presence traffic

Active presence refreshes now run no faster than every 2.5 seconds and heartbeat writes no faster than every 10 seconds, with both winding down to 30 seconds when unchanged. Pointer updates are limited to one per second, and server last-seen timestamps no longer count as meaningful UI changes that keep adaptive polling at maximum speed.

## Hardened existing and protected account shares

Existing shares are migrated to the resource registry during upgrades. Password-protected account shares now require a durable server-side unlock before provider access, cleared expirations are preserved, and revocation polling stops after navigation.

## Restored shared calendars and active meeting links

User calendar shares are delivered immediately into the recipient calendar and resolve through the provider-owned destination. Active link-shared meetings no longer inherit a stale closed state, and release summaries remain hidden throughout guest sessions.

## Stabilized shared calendar controls and guest summaries

Shared calendar view and period controls now use one page-lifecycle event listener that survives every composer rerender. Guest-role logins are recognized alongside scoped share guests, preventing release summaries and account-only dashboard requests.

## Made guest detection and shared calendar input authoritative

Shared calendar controls now listen at the document capture boundary and accept clicks only from their mounted calendar, preventing composer or shell handlers from consuming navigation first. Guest detection now recognizes scoped-session state, synthetic share accounts, and guest/share providers before release summaries or presence requests can start.

## Isolated guest share shells from account startup

Public share and shared-calendar composers now explicitly disable account-only shell enhancements, preventing changelog, profile, presence, and password-verification startup requests before guest authentication settles. Share revocation navigation uses the router capability rather than a fragile runtime import, and falls back to a direct share URL only when no router is mounted.

## Clarified revoked shares and guest controls

Deleting an owned share now confirms “Share Deleted”, while recipients removing access receive separate wording. Revoked shared calendars open their removal popup when selected, read-only whiteboards use a pointer cursor, and page layout editing is always hidden from share guests.

## Preserved meeting guest sessions during page transitions

Page Composer now destroys a previous page’s presence tracker even when the destination has no presence configuration, preventing stale Whiteboard requests from revoking a Meeting guest session. Social presence and password-confirmation cleanup no longer emit global access-denied events for guests, and Meeting distinguishes access failures from genuinely closed meetings.

## Opened meeting deep links directly

The Meetings page now resolves every `meetingId` URL directly, restores that meeting’s participant selection from its payload, and automatically joins it without requiring the meeting to appear in the active-meetings list first. Meeting destinations opened from Shares therefore lead to the referenced meeting.

## Used scoped credentials for shared destinations

Meeting link shares now send their resolved guest credential explicitly when loading the meeting, avoiding races with account or prior-share tokens. Password-protected user shares use their known protection metadata to open the unlock flow directly instead of intentionally producing an initial unauthorized request.

## Keep guest layouts locked and Whiteboard marks visible

Guest sessions now remove the page-layout edit control instead of relying on a late capability check. Whiteboard canvases also select contrasting strokes, selection labels, and presence shading for light and dark themes so marks and collaborators remain visible after theme changes.

## Restore meeting deep links and add Whiteboard keyboard history

Meeting URLs now load their saved participant stage, honor an explicit `start=1` option before auto-starting, and remove invalid meeting identifiers after notifying the user. Meeting share links request auto-start and resolve Share authorization at request time, while Whiteboard supports Ctrl/Command+Z and Ctrl/Command+Y history shortcuts.

## Simplify meeting restoration and stabilize guest share controls

Saved meeting links now restore invitees through the normal participant stage, exclude the current user, and auto-start only when `start=1` is explicitly present. Meeting guest authorization uses the Share gateway contract, calendar controls bind directly to their mounted page, account presence pauses immediately on Share routes, and protected guest links show Cognis branding in the password prompt.

## Match Share branding and complete meeting guest access

The protected-share prompt now matches the compact Cognis header brand exactly and the initial Share document has a resolved title. Meeting share content URLs explicitly request start mode, guest chat reads and sends use the scoped credential, Jitsi resolves guest access through Share, and share owners bypass recipient-only password prompts.

## Restore legacy meeting links and bind calendar controls per render

Meeting guest authorization now preserves compatibility with earlier meeting links whose records predate explicit capability scopes, while still requiring the token to match the requested meeting. Shared calendar controls bind to the freshly rendered calendar card after every composer refresh so view and period changes remain interactive.

## Consolidate Share routes and expand sent-share activity

Share management now lives at `/share`, while public and account shares use `/share/shr_…` and `/share/usr_…` URLs. Link-share rows provide a copy action, sent rows expand into timestamp and recipient activity views, and destructive action icons are centered consistently.

## Keep SPA avatar resources valid

Dashboard shell reuse no longer revokes profile-provider blob URLs when replacing the navbar avatar. Cached avatar URLs therefore remain loadable during later SPA navigations, including Study settings, while their owning provider retains lifecycle control.

## Restore shared calendars and meeting joins

The Calendar page now asks the keyring to unlock received calendars whenever they load, and guest calendar controls replace their rendered view instead of preserving stale DOM. Meeting link guests now carry their scoped share credential into the final join request so the joining stage can complete.

## Keep shared calendar controls active

Public calendar controls now use one page-level delegated interaction boundary. Day, week, month, and year switching and period navigation therefore remain connected after every calendar rerender.

## Open share content directly

Calendar links now open in month view while retaining their persistent view and period controls. Meeting links now enter the shared meeting immediately instead of treating the missing account-page `start` query parameter as an instruction not to join.

## Join guest meetings without cards

Meeting-link guests can now enter a shared meeting even when the scoped response intentionally contains no participant cards. Calendar share controls now update their existing canvas directly, keeping the control DOM stable while changing views and periods.

## Plot share activity over time

Per-share details now combine creation, update, and access activity in a responsive dot graph. Its event-count and timeline axes scale to the available history, and hovering or focusing a point reveals the event and its timestamp.

## Explore complete share access history

Every successful share access is now retained in the unified activity timeline. Graphs use time labels for periods up to two days and dates for longer histories, support drag-selection to zoom into a period, and occupy the full detail width above the recipient list.

## Preserve graph ranges and account sessions

Activity graphs now show second-level time labels for short histories and redraw against the exact range selected by dragging. Existing share timestamps seed the complete graph range, while visiting `/share` restores the account session instead of reusing a guest session; guest activation is limited to valid public link tokens.

## Restore accounts before validation

When `/share` loads after a guest link, the Share gateway now restores the saved account credentials before the Authentication gateway validates the browser session. The dashboard therefore resolves the actual account directly instead of retaining or briefly resolving the scoped guest token.

## Align graph selection and dates

Graph drag selection now follows the cursor through the SVG coordinate transform and always clears its highlight on release or cancellation. Empty periods produce a warning toast, while short time axes include the shared date or separate dates when the endpoints cross a day boundary.

## Generalize graphs and preserve accounts

The reusable graph renderer now supports dot and line modes, uses the full responsive width, and counts event frequency per type and timestamp rather than accumulating forever. Guest activation now snapshots any real account credentials it encounters, even when stale guest state exists, so returning to `/share` can restore the user instead of logging them out.

## Keep valid sessions and compact graphs

The Shares authentication hook now distinguishes stale guest markers from an active scoped guest token, clearing only the stale markers when valid account credentials are already present. Activity graphs use a shorter, wider plot ratio so they remain readable without dominating the expanded share details.

## Separate Shares from share links

Authenticated share management is restored to `/shares`, while `/share/usr_…` and `/share/shr_…` remain the account-share and public-link delivery namespaces. Valid account credentials are now validated before any public-link fallback, so owners opening their own link shares retain their user session instead of becoming guests. The management document no longer loads the guest-session bootstrap at all.

## Clarify access-event tooltips

Every access point in the expanded Share activity graph is now labelled “Accessed” rather than “Last accessed”, because the graph displays the complete access history rather than only its latest event.

## Keep meeting-link guest chat unlocked

Meeting-link guests now receive the meeting chat room key through their scoped share authorization without consuming an account member’s one-time key delivery. The key is stored in the guest’s already-unlocked temporary keyring, preventing repeated unlock and empty room-key popups while the meeting chat loads.

## Start meetings before inviting participants

Meetings can now start with an empty participant stage. Once the organizer actually joins the newly created conference, Cognis automatically opens a link-only share popup as a prompt to create a guest link; redundant account-user sharing methods are excluded from this meeting prompt.

## Complete account-calendar and guest-meeting sharing

The meeting share prompt now opens only for newly started meetings whose participant stage was empty. Meeting-link guests never receive an account-keyring password prompt while their disposable keyring activates, and their authorized meeting chat supplies participant names and avatars without exposing the full participant staging surface. User-shared calendars now honor the Share gateway’s server-side account unlock grant when loading live owner events, including password-protected shares.

## Keep guest keyrings and shared calendars available

Guest sessions now retain the generated disposable-keyring credentials and can re-activate that keyring when a consumer requests access, eliminating account-password prompts during meeting chat loading. Calendar link guests can open events in a read-only inspector, while writable links can also create and edit events. Account-shared calendars reconcile their persistent delivery from active received shares whenever calendars load, keeping owner events visible across reloads until the share is revoked or rejected.
