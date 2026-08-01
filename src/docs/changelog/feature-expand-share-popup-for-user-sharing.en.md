# Share with Cognis users

## The share popup now supports user recipients

Search for Cognis users in the shared popup, attach them to a new share with read access, review recipients on existing shares, and remove access without leaving the popup. All recipient searches and share changes are routed through the Share gateway.

## Link and User are now Share gateway adapters

The popup presents supported methods in a top row and opens a separate, method-owned page for Link or User sharing. Historical shares are filtered by the selected method, while both types can coexist for the same resource.

## Each share method now shows its own controls

Link sharing displays link label and expiry customization, while User sharing displays recipient search, read/write permission, and expiry controls. Switching methods also replaces the visible history with shares of that type.

## Share method pages now load correctly

The Share gateway now registers each discovered adapter's static directory, so the Link and User popup pages load without a 404 response.

## Switching methods now replaces the page

The popup now mounts only the selected adapter's page. Link inputs are not present while sharing with users, and user search and permission controls are not present while creating a link.

## Shares support exact expiry, access modes, and passwords

Link and User pages now use an optional date/time expiry selector and optional password protection. Components can also declare Link access modes, allowing Calendar to distinguish read-only links from read/write links and grant only the corresponding capabilities.

## Protected calendar discovery

Calendar clients now receive an authentication challenge when they probe a valid password-protected calendar share, instead of an indistinguishable not-found response.

## Safe token inspection

Share can verify that a token exists and is active without bypassing its password, allowing Calendar to request credentials before returning any shared content.

## Clear client metadata

Calendar feeds now publish the calendar name and read-only or read-write state, while CalDAV discovery retains the authenticated share address.

## Read-write CalDAV shares

Calendar clients can create, edit, and delete events through read-write link shares and authenticated user shares. Read-only shares continue to reject changes.

## Consistent required fields

Private share passwords now use the standard form builder required marker and native field validation without separate warning messages.

## Named ICS resources

ICS variants now end with the encoded live calendar name and `.ics`. Older token-only addresses redirect after authentication to the named resource, allowing import clients to derive the correct calendar name.

## Enforced read-only transport

Read-only ICS and CalDAV shares reject every mutating WebDAV method with `403` and a `DAV:need-privileges` response. Writable CalDAV shares continue to accept supported event writes.

## Updated calendar icons

Public calendars now use a theme-aware globe SVG, and the share icon is ten percent larger for clearer recognition.

## Safer calendar deletion

The delete action now sits with the other popup actions and requires confirmation before the calendar and its associated shares are removed.

## Theme-aware visibility

Read-only shared calendars now use a view-eye icon with a Read-only hover tooltip, while private calendars use a secure lock icon. Both icons include dedicated light and dark theme variants.

## Authentication remains required

Password-protected ICS and CalDAV links no longer contain derived credentials. Calendar clients must authenticate with the configured share password before receiving calendar data.

## Standards-based permissions

CalDAV discovery now publishes the RFC-defined current user privileges and supported VEVENT component set. ICS WebDAV probes publish read-only privileges because subscription feeds do not support writes.

## Calendar names in addresses

CalDAV variant addresses contain the encoded calendar name, allowing clients to derive a friendly name from the collection URI without exposing authentication material.

## Clear calendar ownership

Shared calendars now use a theme-aware share icon. Deleting an owned calendar removes its links, user shares, and recipient copies, while default calendars remain protected. Recipients can delete a received calendar to leave only their recipient entry; the share is deleted when its last recipient leaves.

## Calendar identity in shares

Calendar shares now retain the calendar name, so links and email messages identify the calendar rather than an internal share identifier.

## Client access discovery

CalDAV clients receive explicit read-only or read-write privilege metadata and avoid write attempts against read-only shares.

## Safer private sharing

Private calendars require a share password, and share emails include the sender, calendar name, visible link, and open button.

## Reliable calendar Web shares

Calendar Web shares now stop loading deterministically, render guest content, and enforce read or write capabilities on guest event operations.

## Clear calendar access modes

Web, ICS, and CalDAV variants display their read-only or read-and-write mode, and calendar feed responses expose the effective access mode to clients.

## Editable share history

Selecting a share restores its values to the appropriate adapter form and updates the existing record. Link shares expose templated email delivery, while user selections retain profile-preview cards without visible handles.

## Live calendar names

Calendar client links now derive their collection name from the current Calendar gateway record, with share metadata used only when the live resource is unavailable.

## Read-only user shares

The User sharing adapter now removes write capabilities whenever Read permission is selected. CalDAV discovery therefore exposes only read privileges and calendar clients disable editing.

## Duplicate user shares are blocked

An object cannot be shared with the same user more than once, even when the requested access mode differs or an existing share is edited to target that user.

## Read-only calendars are clearer

Read-only shared calendars display a lock in the calendar list and are excluded from the event composer’s calendar choices. Shared-calendar guidance now states explicitly that recipients cannot edit the calendar name.

## Direct SMTP delivery

Generic templated email requests now target the enabled SMTP sender directly instead of depending on notification-category preferences, preventing valid share emails from being skipped.

## Clear send validation

The email dialog now labels its confirmation action Send and displays a warning toast when no recipients have been added.

## Component-contributed templates

Components can now register email templates through the Notification gateway capability and select those templates when requesting delivery.

## Provider-neutral SMTP

The SMTP adapter now exposes only generic template-based email delivery and has no knowledge of Share terminology or message content. Share owns and registers its own email template.

## Immediate history updates

New shares now appear in link history as soon as the Share gateway confirms creation, without depending on the Calendar editor's Save Changes action.

## Reliable history refresh

Failed history requests no longer replace the visible list with an empty result, so confirmed shares remain available while the popup retries synchronization.

## Private shares explain their password requirement

Private calendar link shares now use the standard information bubble to explain why a password is required.

## Secure passwords can be generated in place

A refresh-style control beside the password field creates a secure, readable share password without leaving the form.

## Calendar share URLs are canonical

New ICS and CalDAV links include the calendar name directly and no longer retain token-only compatibility routes.

## Dedicated share emails

Link shares can now email multiple tagged recipients through the SMTP notifier using a share-specific message and action button. Per-sender recipient delivery is limited to once every 12 hours.

## Interactive calendar shares

The Web calendar variant now renders one guest calendar and permits event creation only when the share grants write access.

## Clearer people sharing

People search results appear directly below the search field, selected people retain their full profile cards, and user-share empty text no longer refers to calendar-client links.

## Separate email dialog

The email action now appears beneath each link-share heading and opens a focused recipient dialog instead of switching the share form into edit mode.

## Easy update cancellation

Link and user update forms now include a close action that clears restored values and returns immediately to create mode.

## Simpler variant labels

Calendar variant buttons use concise Web, ICS, and CalDAV labels while access enforcement remains available to calendar clients through response metadata.

## Revocation and expiry

Delivered user-share objects are removed when their share is revoked or expires, and later writes are rejected because the recipient mapping is no longer active.

## Calendar behavior

User-share permission badges follow the selected access mode before creation. Shared calendar names allow a local 30-character name while preserving the immutable shared-by suffix. Responses to events already stored in a shared calendar update that global event instead of importing a duplicate.

## Share actions load the complete share page

Opening a Share notification now performs a full document navigation for its `/share/…` action. This ensures the share page installs its authentication, password-keyring, and renderer hooks instead of being ignored by the dashboard SPA router.

## Share passwords are ready to send

After creating a password-protected link or user share, a popup presents the password in a concealed field with the standard reveal control and a copy action.

## Share history has creation times and form editing

Every share card shows when it was created. Selecting a user-share card loads its recipients, permission, expiry, and other values into the share form for an explicit update instead of editing controls inside the history card.

## User counts and notification actions work reliably

The user-share action updates its recipient count as people are selected or removed. Opening an in-app share notification can now mark that notification read through the canonical inbox route.

## Protected shares prompt instead of appearing missing

The Share gateway now distinguishes a valid password-protected token from an invalid token. The share page receives an authentication challenge, checks the encrypted keyring, prompts when needed, saves the verified password, and then loads the shared object.

## Notification access no longer replaces login state

Logged-in recipients retain their account token when opening a share notification. A separate scoped share token is passed directly to component renderers for shared API operations, so Calendar writes remain permission-controlled without logging the user out.

## Shared calendar appearance stays local

Recipients can change the color of a shared calendar without changing the owner’s calendar. Names, sharing settings, and deletion remain owner-controlled.

## Shared event permissions are explicit

Read-only calendars no longer show a generic editing error. Writable recipients may create, update, and delete events, but cannot answer invitations or change participant responses through the shared calendar.

## Share passwords remain available

When the encrypted keyring is locked, a newly verified share password remains securely in memory for the active session instead of producing a save error.

## SMTP security details open reliably

Configured SMTP two-factor methods can open their management popup even when no displayable secret details are stored.

## Single-step client authentication

Password-protected calendar-client variants now carry a scoped, reproducible transport credential so clients can authenticate without displaying a second password prompt.

## Recognizable calendar identity

CalDAV collection URLs include the calendar name, while discovery continues to publish the display name and effective read-only or read-write privileges.

## Password protection retained

The transport credential is derived from the protected share and does not expose the chosen share password. Direct password authentication remains supported.

## Unlock shares without leaving your page

User-share notifications now open their password prompt inside the signed-in dashboard and reuse a saved keyring password without opening the public share page.

## Shared calendars join the recipient account

After successful authorization, Calendar adds the shared calendar to the recipient's account and opens it directly. Calendar remains responsible for read-only or read-write enforcement and synchronized content.

## User shares notify recipients

Sharing an item with Cognis users now sends a Share-category notification through each recipient's configured notification preferences. The notification opens the shared item directly.

## Passwords stay encrypted in a keyring

Password-protected user shares prompt recipients to unlock the item once and save the verified password in a browser keyring encrypted from their login password. Components access entries through named keyring capabilities rather than plaintext storage.

## Relocking is configurable

Security settings now let users keep the keyring unlocked until logout or automatically relock it after a selected period. Read-only and read-write permissions continue to govern the shared component data.

## Internal packages install locally

All internal Cognis dependency ceilings now include the versions present in this repository, preventing npm from attempting to download private workspace packages from the public registry.

## Version updates stay atomic

Contributor guidance now requires versions, manifests, dependency specifications, the lockfile, and every translated version index to be updated and verified together.

## Calendar-ready link variants

Calendar shares now expose Web, ICS, and CalDAV variants backed by one Share gateway token, so browsers and calendar clients receive the format they expect.

## Sharing popup fixes

Calendar share revocation is authorized correctly, opening the Share popup no longer traps the Calendar editor, and user lookup results show linked profile avatars.

## Shared Events Stay Upcoming

Events from received calendars now remain visible in Upcoming Events, side-menu headings are centered, and the Calendar layout can no longer be rearranged with page-composer editing.

## A Synced User Keyring

The encrypted browser keyring now synchronizes only opaque ciphertext through authenticated keyring endpoints. User Settings includes a Keyring page for adding, editing, and removing secrets after an explicit password confirmation.

## Meetings and Chats Use the Keyring

Generated meeting passwords and chat encryption keys are added to the keyring automatically. If an edited secret is invalid, keyring resolution removes it and prompts for or retrieves a current value so access continues.

## Keyring controls and inventory

The Keyring settings page now keeps its explanation in an information popup, lists stored secrets in a structured table, and provides manual lock and password-protected unlock controls. Automatic locking is configured alongside the keyring instead of on the general Security page.

## Private share passwords are identifiable

Passwords verified for protected calendar shares are saved with descriptive keyring metadata and synchronized as part of the encrypted vault, so they appear in the user's key inventory without exposing their plaintext to the server.

## Provider-aware password confirmation

Password confirmation now belongs to the Authentication gateway and is exposed as an `auth:confirmPassword` capability for sensitive flows. Confirmation is routed through the account's active provider, including separately namespaced LDAP sources, instead of assuming every account has a local password record.

## Keyring locking follows confirmation

Unlocking the keyring now uses the Authentication gateway's provider-aware password confirmation prompt and its normal freshness window. Locking invalidates that confirmation window so the next secret query requests the account password, while the automatic-lock preference remains editable even when the vault is locked. The Keyring page also has a roomier responsive layout.

## Inspectable component secrets

Keyring entries now identify the component that stored them, expand on click, and provide an SVG eye control for revealing the secret. Opening Keyring settings automatically requests provider-aware confirmation and unlocks the vault when possible. Locked entries remain visibly obfuscated, and the themed Keyring Lock Timeout control stays grouped with its label.

## Database-backed opaque keyring vaults

Encrypted keyring envelopes now persist in a dedicated authentication database table instead of the general preference store. The browser fetches and decrypts the envelope only as part of unlocking, and locked Keyring settings render synthetic placeholders without secret identifiers, metadata, or values in the DOM.

## Revalidated protected calendar access

Every load of a password-protected recipient calendar now revalidates its share password on the server. Calendar loading first unlocks and checks the user's keyring, prompts when the key is absent or invalid, and offers an explicit opt-out control so recipients can choose not to save the verified password.

## Refused secret prompts stay locked

Cancelling keyring and secret prompts now leaves the protected object unavailable instead of continuing with partial access. Locked shared calendars appear grey with an explanatory tooltip and retry their unlock flow when clicked. Once the keyring is unlocked, its add, edit, delete, and reveal controls remain freely usable without repeated account-password confirmations.

## Shared calendars no longer imply event invitations

Creating an event in a calendar with user shares no longer adds every share recipient as an attendee; recipients can still view the event through the shared calendar, while invitations are sent only to explicitly selected attendees. Keyring pages reuse an already-unlocked vault, and locked-vault prompts now use the dedicated Unlock Keyring wording and a deferred page-action flow so navigation finishes before a popup opens.

## Save Password Preference

The protected-share prompt now asks whether to save the password to the keyring using positive wording. The option is selected by default and can be cleared to use the password without storing it.

## Move encrypted secrets into the required authentication keyring adapter

The keyring client, persistence store, and API route now belong to a required Authentication adapter. Legacy preference migration and plaintext chat-room key retrieval were removed, so secret consumers resolve keys exclusively through the encrypted keyring.

## Keep sharing responsibilities within their owning adapters

The User Share adapter now enforces recipient uniqueness, while SMTP remains solely responsible for queued email rate limiting. The Share gateway only orchestrates these adapter-owned policies.

## Align keyring bootstrap with capability architecture

The reusable browser keyring is contained in the required Authentication adapter. The required Authentication adapter now self-bootstraps its vault and route capabilities during gateway discovery, receives authentication through route context injection, and includes component-owned documentation.

## Restore source-size and dependency compliance

Large Calendar route and test files were split into focused modules, oversized touched files were brought below the 1,000-line limit, and Share dependency ceilings now match the tested workspace version.

## Contain the complete keyring in its Authentication adapter

The browser keyring now lives with the adapter’s store, routes, manifest, and documentation. The adapter registers its own static UI directory during discovery, and every consumer imports the adapter-owned browser surface.

## Share and keyring adapters appear in Administration

The Keyring, Link, and User adapter manifests now advertise their Authentication or Share parent gateway. The required encrypted Keyring, Link, and User adapters expose locked component metadata and canonical administration controls, including valid empty configuration surfaces.

## Email delivery uses one capability

SMTP test messages, user verification, invitations, one-time login messages, and queued verification messages now use the adapter-owned `notify:sendEmail` ctx capability. Administration and email-verification route tests cover successful capability dispatch so regressions no longer surface as unexplained `400` responses.

## Adapter ownership is discovered centrally

Core gateway bootstrap now derives `hasAdapters` from each adapter manifest's `gateway` field. Gateways no longer need duplicate adapter-presence flags in their own manifests or bootstrap registration.

## Room keys arrive automatically

Opening a room now generates a missing room key on the server and delivers it only to an approved room member. Messages prompts to unlock the encrypted keyring when necessary, validates the delivered key, stores it under the room capability identifier, and then opens the encrypted thread.

## Temporary keyrings for share guests

A valid share token now creates an isolated guest identity with a derived keyring passphrase. The browser opens that session-only keyring automatically, keeps it unlocked for the guest identity lifetime, and stores guest secrets without touching a signed-in user's vault. Expired guest cleanup removes the matching server-side keyring vault alongside the guest profile.

## Message loading waits for the keyring

Login now persists the authenticated account before unlocking its encrypted keyring. Messages deduplicates concurrent room opens and pauses live conversation refreshes until room-key delivery and any required unlock prompt have completed, preventing background polling from raising missing-key promise rejections.

## Keyrings follow every component loading flow

Password and TFA login paths now unlock the user's keyring before navigation while preserving the configured automatic lock timeout. The Messages adapter owns a staged chat-loading flow that resolves, obtains, validates, and persists room keys; the Messages page, global search, notifications, and Meetings mini-chat all consume that shared capability instead of importing keyring internals.

## One keyring state and one unlock prompt

Keyring consumers now share one unlock request capability and one in-flight prompt. A successful unlock immediately applies to Meetings, Messages, notifications, shares, and Keyring settings until the configured automatic lock timeout expires. The shared prompt now uses general keyring wording rather than referring to a chat room.

## Keyring requests explain who needs access

Every keyring unlock request must now provide a component, action, and process. The shared popup displays all three, such as “Meetings” requesting access to “join” “meeting 123456”, so users can understand why their encrypted secrets are needed before entering a password.

## First login sets up keyring encryption

On a user's first login, the Keyring adapter now contributes a post-login setup stage that asks for an optional dedicated keyring password. Leaving it empty uses the account password. Existing keyrings unlock through the same stage, while unlock prompts now refer only to the keyring password and display request details without decorative quotation marks.

## Keyring activity and lifecycle controls

The unlock request separates its explanation from the password instruction with a blank line. Keyring settings now show an encrypted activity log for unlock, read, write, removal, clear, and password-change events, including identifiers and timestamps, and provide controls to clear stored secrets or change the encryption password. Deleting a user also purges that account's keyring vault.

## Complete, browsable keyring history

The keyring now retains its complete encrypted activity history. Settings presents Keys and Logs as collapsible sections and paginates log records while the vault is unlocked.

## LDAP deletion now purges keyrings

The keyring adapter now participates in the same user-deletion cleanup flow as Calendar and Messages, normalizes LDAP account identifiers, and removes the matching encrypted vault after account deletion persists.

## Deleted vaults invalidate browser copies

A successful empty response from the keyring API is now authoritative. After administrative deletion, the next login discards the browser's encrypted copy, opens first-login keyring setup, and cannot restore deleted entries or logs.

## Account-instance-bound keyrings

Authentication now assigns each account lifecycle a transient secondary identifier. Keyrings store and validate that identifier, so deleting and recreating the same LDAP username purges stale server and browser vaults. Keyring settings also add the expanded timeout choices, use the reusable information tooltip, and clarify clear-vault actions.

## Account-instance protection across user data

Calendar, classroom, chat, profile, preferences, social graph, and notification data now register as account-data owners. Authentication records the account instance each owner last served and automatically destroys that owner's stale records before a recreated account can access them.

## Keyring setup after dashboard arrival

New users now reach the dashboard before the User Keyring setup dialog opens. The dialog explains that the keyring protects passwords and encryption keys used by Cognis features. GitHub Actions now runs the full test suite explicitly after typechecking.

## Configurable, self-contained keyring administration

Keyring storage limits and password-derivation strength are now managed through Authentication adapter settings. The adapter owns its settings UI, translations, routes, and technical documentation, and unlock instructions use separate translatable text keys.

## Readability spacing is enforced

Intentional blank lines between Calendar and SMTP class methods and between Jitsi initialization blocks have been restored. The readability lint now protects these boundaries so formatting cannot silently collapse them again.

## Keep edited user shares synchronized

Share edits now run through a staged lifecycle so delivered calendars immediately reflect recipient removal, permission changes, and updated expiry.

## Preserve saved passwords and offline keyrings

Saved share passwords now use the same token identifier used for lookup. Keyrings created offline are uploaded when connectivity returns and are discarded only when the server confirms that the account instance changed.

## LDAP reports actionable bind failures

LDAP setup now translates directory error code 0x31 into guidance to verify the bind DN and password, while detailed causes remain in structured server logs.

## SMTP tests use the delivery queue

SMTP test messages now pass through the adapter-owned queue and rate limiter. Failed tests return a specific, actionable response instead of a generic request failure.

## Saved LDAP servers enable correctly

Authentication adapters now report their setup state through their gateway contract. A complete saved LDAP server set is recognized even though its fields and redacted password are nested under `servers`.

## Adapter boundaries are restored

SMTP now owns and registers its test route, while gateway routes use gateway contracts instead of holding notification or authentication adapter instances. Localized version indexes now match every component manifest.

## Consistent room membership timelines

Message requests no longer create event-only direct-message rooms. Membership changes and their passive timeline events are now atomic, and meeting chats record a join event for every resolved participant.

## Keyring prompts only when content needs them

Login now tries the account password opportunistically without opening a keyring dialog when it differs. The contextual unlock prompt appears only when a component actually resolves protected content.

## Calendar shares unlock and render once

A verified password is now reused when an imported user calendar loads, newly imported calendars show a success toast, and public calendar links mount the Calendar-owned guest renderer instead of remaining on the loading screen.

## Contextual chat unlock survives reloads

Messages now identifies itself as Social Messages when requesting existing chat secrets, avoids a second save-secret prompt after cancellation, and refreshes encrypted previews immediately after unlock. A non-extractable session key restores the unlocked keyring after a page reload in the same tab. Calendar's add action is slightly larger and now reads “+ New”.

## Hardened portable sharing and encrypted meeting chat

The Share popup now uses an optional UI avatar capability with an initials fallback, so it remains available without Social. Meeting-share guests receive the authoritative chat key through their temporary keyring, incorrect stored room keys are replaced, and large encrypted keyring vaults are encoded in safe chunks. Localized keyring documentation and component version indexes are synchronized, and Calendar stylesheet spacing is restored.

## Automatic content unlocking and full calendar link rendering

Direct page loads and refreshes now bootstrap the required keyring before session authentication, automatically restoring the tab unlock or prompting when protected content needs it. Calendar link shares render one isolated calendar card with the standard view switcher and timeslot table; writable tokens can create, edit, and delete events without exposing other calendars or dashboard controls.

## Passwordless guest keyring sessions

Anonymous calendar-share guests no longer trigger the account-keyring unlock prompt. Share now limits account-keyring lookup and password saving to validated account sessions, while delivered guest keyrings activate automatically, remain unlocked for the guest session, and are deleted with their session-only vault when the guest session ends.

## Reliable guest calendar controls and scrolling

Calendar link-share view switching and period navigation now use a stable delegated interaction boundary that survives composer refreshes. Vertical scrolling is confined to the timeslot grid rather than the widget card, matching the signed-in Calendar view. Reloaded guest identities are also excluded from account-keyring resolution, eliminating the remaining guest keyring popup.

## Password-aware resolution and safe share deletion

Share URLs now probe the gateway before touching the account keyring, so keyring access occurs only after the gateway returns a password challenge. Missing or revoked links render the existing no-longer-available message for both share pages and notification actions. Revoking any share now requires an explicit confirmation popup before deletion.

## Restored Calendar controls and writable-calendar guard

Calendar view switching, period navigation, and timeslot event creation now use a persistent delegated interaction boundary that remains active across composer rerenders. Before opening the event composer, Calendar evaluates every available calendar with the existing shared-write rules and shows “No Writable Calendars Found” when none can accept an event. Guest calendar writes continue through the scoped guest token.

## Calendar shares use the proven meeting-page lifecycle

Share now hands Calendar the page root after resolution, exactly as it does for meeting links. Calendar owns the resulting full page composer, so the standard header, theme controls, footer, and lifecycle render together with the single-calendar card instead of leaving the Share loading placeholder visible. Delegated view, navigation, timeslot, and guest-token event controls remain attached across calendar rerenders.

## Reliable shared-calendar controls and exact keyring expiry

Calendar share pages now bind navigation, view switching, timeslot, and event controls from the composer's render lifecycle, matching the proven Jitsi Meet share pattern. Keyring relock choices now use an absolute deadline that is neither extended by activity nor reset by page or server reloads; “On Logout” has no deadline and locks exactly when the authenticated session ends.

## Reliable shared-calendar controls and exact keyring expiry

Calendar share pages now bind navigation, view switching, timeslot, and event controls from the composer's render lifecycle, matching the proven Jitsi Meet share pattern. Keyring relock choices now use an absolute deadline that is neither extended by activity nor reset by page or server reloads; “On Logout” has no deadline and locks exactly when the authenticated session ends.

## Cancel-safe keyring access and destructive recovery

Cancelling any keyring prompt now flushes concurrent requests, pauses encrypted chat polling, and suppresses further automatic prompts until a floating manual-unlock control succeeds or the page reloads. Locked Settings keeps its clear action available as an explicitly destructive reset that removes only keyring-dependent memberships, deletes the vault, preserves account identity and unrelated profile/social data, and starts first-time setup; unlocked clearing remains non-destructive.

## Keyring reset preserves social identity

Destroying a keyring no longer removes message-room memberships. Profile-backed social actions also recreate a missing authenticated profile before use, preventing blank actor names for accounts affected by an earlier destructive reset.

## Direct conversations are idempotent

Concurrent requests to start the same direct conversation are serialized and recheck for an existing room, preventing duplicate rooms from rapid or overlapping requests.

## Messages wait for active key loading

Concurrent room-key resolution is coordinated per room so SPA entry cannot display a stale unlock-required state while the unlocked keyring is already resolving the same room key.
