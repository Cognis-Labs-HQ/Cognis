# Refine share management

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

## Complete shared calendar and meeting guest loading

Received calendars now retry password-protected event requests through the Share keyring whenever the server challenges them, even when cached share metadata is incomplete. Guest calendar controls use one mount-scoped event boundary and replace stale rendered markup. Meeting guests now use their scoped credential both to load the meeting and to complete the join request.
