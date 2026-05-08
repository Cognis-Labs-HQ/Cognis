# Changelog

All notable changes to Cognis are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Timestamp translation utility (`src/ui/reuse/timestamp.js`): `formatDate`, `formatDateTime`, `getEffectiveTimezone`, and `syncTimezoneOnLogin`. All UI timestamps now route through this module and respect the user's effective timezone. ([eefdcad](https://github.com/le-firehawk/Cognis/commit/eefdcad))
- Timezone preference in Settings → Date &amp; Time: a dropdown populated from `Intl.supportedValuesOf('timeZone')` lets users override browser auto-detection with a specific IANA timezone. The selection is persisted to `ui-preferences` via the existing preferences API. ([eefdcad](https://github.com/le-firehawk/Cognis/commit/eefdcad))
- `syncTimezoneOnLogin`: after a successful login, the browser's detected timezone is saved to `ui-preferences.detectedTimezone` (and to `cognis_timezone` in localStorage) whenever the timezone preference is set to "auto". If the user has set a specific timezone, that overrides auto-detection on every login. ([eefdcad](https://github.com/le-firehawk/Cognis/commit/eefdcad))
- Dashboard clock widgets: separate digital and analogue page-composer elements added to the dashboard. Both use the user's effective timezone from `getEffectiveTimezone()`; the digital widget now keeps the date on its own line below the time, and both widgets are wider and shorter to better fit the dashboard grid. ([bd4bebb](https://github.com/le-firehawk/Cognis/commit/bd4bebb))
- Public registration: 5-minute unverified account cleanup — after a public registration the server schedules a 5-minute timer that deletes the account if no verified email address is present by expiry. The register page now shows an info callout warning the user that email verification is required within 5 minutes. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))
- Invite page: `notify:hasVerifiedEmail(accountId)` capability contributed by the notification gateway bootstrap, backed by a new `DbNotificationStore.hasVerifiedEmail` method. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))

### Changed

- Tooling/Auth security: removed arbitrary `cognisctl api:request` access, added `cognisctl api:token`, and introduced `POST /api/v1/auth/emergency-token` (admin-only) to mint a temporary 1-hour privileged token for emergency curl operations. ([105c573](https://github.com/le-firehawk/Cognis/commit/105c573))
- User-facing UI timestamps now consistently route through `src/ui/reuse/timestamp.js`, including the Users details popup and the Administration registration invite table backed by DB query results. ([cea7198](https://github.com/le-firehawk/Cognis/commit/cea7198))
- Invite page: table headers now match the Administration → Registration table (Email, Issuer, Username, Status, Expires At, Actions); dates are formatted with `toLocaleString`; revoke button now shows success/failure toasts and refreshes the page immediately. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))
- Typing message "Register your account today": ownership moved from the registration gateway to the public adapter (`ownerType: "adapter"`, `ownerId: "public"`) and gated by an `isEnabled` callback — the message is only included in the auth-typing response when both the registration gateway and its public adapter are enabled. `AuthTypingMessage` now accepts an optional `isEnabled?: () => boolean` field; the `/api/v1/ui/auth-typing-messages` route evaluates it before the existing owner-type checks. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))

### Fixed

- Security: Administration gateway disable now re-queries the live gateway for its current adapter list and disables all enabled adapters _before_ disabling the gateway itself, so the adapter-disable API calls are not skipped by the disabled-gateway route filter. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))
- Security: `registration:public:isEnabled` capability now returns `false` when the registration gateway is disabled, and `registration:public:register` throws `gateway_disabled` in the same state. Previously, disabling the gateway while the public adapter remained enabled allowed unauthenticated users to still create accounts through the auth gateway's `/api/v1/auth/register` route. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))
- Security: SMTP `buildMessage` now strips CR and LF characters from all header values (From, To, Subject) before inserting them into the raw message. A display name containing CR/LF could previously inject arbitrary mail headers (e.g. `Bcc:`) into invite emails. ([fb70bf4](https://github.com/le-firehawk/Cognis/commit/fb70bf4))

### Added

- Invite flow: trusted-domain gate — when a trusted-domains list is configured in Security Settings, sending an invite to an email outside those domains returns `422 email_domain_not_allowed`. The Invite page detects this error, shows a toast, and re-opens the email prompt instead of closing the popup. ([25e730a](https://github.com/le-firehawk/Cognis/commit/25e730a))
- Password re-confirmation freshness window — `/api/v1/auth/verify` now returns 200 immediately (without checking the password) when the caller's access token was issued or last password-confirmed within the past hour. On successful password confirmation the timestamp is stored per-token; future calls within the window skip re-entry. ([25e730a](https://github.com/le-firehawk/Cognis/commit/25e730a))
- Login page: Public Registration callout — when the public-registration adapter is enabled, a "Not Registered?" info callout with a "Sign Up!" link to `/register` appears above the Login button. Driven by a new public `GET /api/v1/auth/registration-config` endpoint contributed by the registration bootstrap. ([25e730a](https://github.com/le-firehawk/Cognis/commit/25e730a))
- Public registration: post-registration email verification — after account creation the server returns a short-lived `verifyToken`; the registration page uses it to add the supplied email address and walk the user through a verification-code prompt before redirecting to login. Skipped gracefully when the notify gateway is unavailable. ([25e730a](https://github.com/le-firehawk/Cognis/commit/25e730a))

- Registration form: confirm-password field — submission is rejected client-side if the two password entries do not match. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- Registration form: language-selector dropdown — queries `/api/v1/system/languages`, pre-selects the best browser-language match (falling back to English), and sets that language as primary preference on successful account creation. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- Login and Register pages now redirect authenticated users (detected via `cognis_token` in localStorage) to `/dashboard` immediately, preventing already-logged-in users from seeing the auth forms. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- Invite-based registration now passes the user-supplied `displayName` to the profile gateway's `profile:createProfile` capability, so the display name set at sign-up is immediately visible in the User Profile page when the profile gateway is enabled. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- Registration gateway now discovers pluggable registration adapters from `src/adapters/registration/`; added `invite` and `public` adapters. Public registration is adapter-backed and disabled by default, while invite workflows are adapter-gated. ([0e601ea](https://github.com/le-firehawk/Cognis/commit/0e601ea))

### Fixed

- Login redirect reasons now preserve `account_disabled` and `account_deleted` after access-token revocation, instead of falling back to `session_expired` whenever a kicked user hits a protected page. ([85af87c](https://github.com/le-firehawk/Cognis/commit/85af87c))
- Founder invite navbar access now uses the limited `/api/v1/registration/state` capability (including `gatewayEnabled`) instead of the admin-only registration gateway endpoint, so founders can open Invite when registration is active. ([85af87c](https://github.com/le-firehawk/Cognis/commit/85af87c))
- Invite/user sensitive actions now reuse a fresh password confirmation before showing the reprompt popup again, so backing out of Invite after confirming does not immediately force another password entry. ([f05d7f2](https://github.com/le-firehawk/Cognis/commit/f05d7f2))
- Administration gateway lifecycle controls now use single, adapter-aware confirmation flows: disabling any adapter always confirms that adapter first, last-adapter disable warns the gateway will also be disabled, gateway disable warns that all adapters will be disabled, and gateway enable offers optional adapter checkboxes to enable in the same popup. ([f05d7f2](https://github.com/le-firehawk/Cognis/commit/f05d7f2))
- Administration adapter-config popup now hides the "Send Test Email" controls for adapters that do not support test sending (for example, Registration/Invite), instead of rendering the test-email section unconditionally. ([c4ae99a](https://github.com/le-firehawk/Cognis/commit/c4ae99a))
- Invite registration links now return `invite_disabled` when the invite adapter is disabled, and the `/register?token=...` UI shows the closed-registration message instead of an invalid-token error, keeping invite behavior adapter-contained. ([c4ae99a](https://github.com/le-firehawk/Cognis/commit/c4ae99a))
- Active auth-gateway routes now align with public-registration verification expectations: `/api/v1/auth/register` returns `verifyToken`, and `/api/v1/auth/verify` applies the one-hour freshness short-circuit (since login or last confirmation), preventing unnecessary password prompts and enabling the post-register email verification popup flow. ([c4ae99a](https://github.com/le-firehawk/Cognis/commit/c4ae99a))
- `createUnsavedChangesBar`: Save button now auto-clears the dirty state and hides the bar immediately after `onSave` resolves, rather than leaving it visible until the page reloads or a toast auto-dismisses. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- `openPopup`: keyboard Enter handler now only fires for the topmost popup overlay, preventing a nested popup (e.g. the email-input prompt inside the invite reprompt flow) from accidentally re-triggering the parent popup's confirm action. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- `GET /api/v1/notifications/providers` no longer requires admin role — any authenticated user can now retrieve the list of notification senders, fixing a 403 error that blocked non-admin users from managing their notification preferences. ([8aa9cf8](https://github.com/le-firehawk/Cognis/commit/8aa9cf8))
- Login/Register redirect loop on stale tokens fixed: auth pages now validate the stored token before redirecting to `/dashboard` and clear stale auth state on 401/403. Login now shows a permanent reason toast when redirected with `?reason=session_expired|account_disabled|account_deleted`. ([0e601ea](https://github.com/le-firehawk/Cognis/commit/0e601ea))
- Administration → Registration token table now includes Issuer and Username columns, with profile links when the profile gateway is enabled. ([0e601ea](https://github.com/le-firehawk/Cognis/commit/0e601ea))

- Reusable `renderInfoTooltip(text)` component (`src/ui/reuse/info-tooltip.js` + `src/ui/styles/reuse/info-tooltip.css`): renders a small ℹ icon that reveals a tooltip panel on hover/focus; imported in `page-builder.css`. ([1856b39](https://github.com/le-firehawk/Cognis/commit/1856b39))
- `createPageComposer` now accepts `onBeforeSubPageSwitch(fromId, toId): Promise<boolean>` — a navigation guard called before switching sub-pages; returning `false` cancels the switch. ([1856b39](https://github.com/le-firehawk/Cognis/commit/1856b39))
- Administration page: navigation guard prompt when leaving a sub-page with unsaved changes — user is given the option to discard and continue or stay on the current section. ([1856b39](https://github.com/le-firehawk/Cognis/commit/1856b39))
- Administration page: `beforeunload` handler prevents accidental page refresh/close when security settings are dirty. ([1856b39](https://github.com/le-firehawk/Cognis/commit/1856b39))

- Public `GET /api/v1/ui/auth-typing-messages` route plus shared `src/ui/reuse/auth-typing.js`, allowing enabled gateways (and future module manifests) to contribute extra `typing-text` samples to the login/register auth pages. Registration now contributes `Register your account today`, and Profile now owns the `It's a social space!` sample. ([a04da95](https://github.com/le-firehawk/Cognis/commit/a04da95))
- Registration page (`/register`) now shows the cognis-ad-frame typing showcase in the intro panel (same component as the login page). ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Registration page: when a valid invite token is present, a live HH:MM:SS countdown (`Expires in: …`) is shown below the inviter greeting and ticks down every second until the token expires. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- `VerifyTokenService.ttl(token)` method returns the milliseconds remaining for an in-memory email-verification token without consuming it; returns `null` when unknown or expired. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- `showToast` now accepts a `permanent: true` option that suppresses the auto-dismiss timer; the toast remains until the user clicks the close button. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Popup `openPopup` now binds the Enter key to the first `btn-confirm`-variant action button, so keyboard-centric users can confirm dialogs without moving to the mouse. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- DB migration `006_user_emails_cascade`: adds `ON DELETE CASCADE` on `user_emails.account_id` for all three supported database backends (SQLite trigger, PostgreSQL/MariaDB FK), so deleting an account also removes its email rows and frees those addresses for re-use. Init SQL for fresh installs updated to include the constraint from the start. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))

### Changed

- Administration → Security: "Enable registrations" heading renamed to "Public Registration"; plain checkbox replaced with a slider toggle. "User validation" renamed to "User Validation Method". Inline hint text replaced with `renderInfoTooltip` icons on all three Security section headings. ([1856b39](https://github.com/le-firehawk/Cognis/commit/1856b39))
- Theme toggle persistence is now auth-aware: authenticated pages still sync `ui-preferences`, while unauthenticated pages (login/register) only update the local theme cookie/localStorage and no longer attempt 401ing preference reads/writes. Theme-toggle binding is also idempotent so auth pages do not double-bind the button. ([a04da95](https://github.com/le-firehawk/Cognis/commit/a04da95))
- Timed toasts now render a thin horizontal timeout bar across the top edge that shrinks leftward until dismissal; permanent toasts keep a manual close button. ([a04da95](https://github.com/le-firehawk/Cognis/commit/a04da95))
- Login and Registration intro subtitle markup now uses `auth-intro` and shared copy (`Try learning differently`) to keep both auth pages consistent. ([6f0f3db](https://github.com/le-firehawk/Cognis/commit/6f0f3db))
- `login-template-box` CSS class renamed to `cognis-ad-frame` across `login.css` and the login page template. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Typing-showcase inter-sample pause (after erasing one phrase before typing the next) extended from 400 ms to 60 s on both the login and registration pages. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Added reusable `renderInPageCallout` template plus shared callout styles (BookStack-style variants), switched register invalid-token page content to a danger callout with the title `Error`, and moved typing-showcase 60-second hold to the fully rendered message before deletion. ([33731a0](https://github.com/le-firehawk/Cognis/commit/33731a0))
- Login form `preferenceKey` simplified from `login-layout-v2` to `login-layout`; register form from `register-layout-v2` to `register-layout`. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Login form now uses `method="POST"` and reads credentials by element ID rather than `name` attributes, preventing credentials from appearing in the URL if form submission ever fires natively. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Login submit handler and typing showcase are now bound inside `onRender` so they survive any composer re-render; removed module-level binding that was lost on re-render. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Login error handling now guards against a missing `body.error` object and falls back to `ui.app.login.error.generic`. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Frameless page-composer mode now also removes the `content-section` border/background, ensuring the background is truly indistinct. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Frameless auth pages now also clear the remaining workspace/content-panel shell styling so the bottom/outer frame is fully invisible. ([a04da95](https://github.com/le-firehawk/Cognis/commit/a04da95))

### Fixed

- Administration: gateway toggle handler selector now excludes adapter checkboxes (`:not([data-adapter])`), preventing adapter enable/disable events from triggering gateway-level confirm popups and vice versa. Enabling an adapter no longer opens the gateway-enable adapter-selection prompt; disabling an adapter no longer spawns the gateway-disable confirm dialog. ([20ba343](https://github.com/le-firehawk/Cognis/commit/20ba343))

- Login/register public pages no longer attempt authenticated `ui-preferences` or `{page}-layout` fetches when there is no access token, eliminating the 401 spam that interfered with login-page behaviour. ([a04da95](https://github.com/le-firehawk/Cognis/commit/a04da95))
- Login/register auth pages now explicitly disable composer layout-preference persistence and theme `ui-preferences` API sync, preventing stale-token 401 preference calls while preserving local theme toggle behavior and typing-text rendering. ([ebe672e](https://github.com/le-firehawk/Cognis/commit/ebe672e))
- Auth-page composer now invokes per-element `onRender` callbacks in rendered sections, restoring login submit interception and typing-showcase startup on login/register pages. ([692465b](https://github.com/le-firehawk/Cognis/commit/692465b))
- `loadAuthTypingSamples` no longer throws `ReferenceError: key is not defined` when resolving translated typing keys, restoring login/register startup and invite-token invalid toast rendering. ([6f0f3db](https://github.com/le-firehawk/Cognis/commit/6f0f3db))
- Registration invite pages now treat empty `?token=` as invalid and shade/disable the full registration form shell when invite tokens are invalid/expired. ([6f0f3db](https://github.com/le-firehawk/Cognis/commit/6f0f3db))
- Registration invalid-token permanent toast is now guarded against composer re-renders so duplicate persistent error toasts are not created. ([5a88245](https://github.com/le-firehawk/Cognis/commit/5a88245))
- Registration invalid-token toast dedupe now keys by token value so repeat renders of the same token stay deduped while a different invalid token can still surface its own permanent toast. ([f8f26d6](https://github.com/le-firehawk/Cognis/commit/f8f26d6))
- Invalid registration tokens now show a permanent error toast (`This invitation token is invalid or has expired.`) and render the registration form in a fully disabled state rather than hiding it entirely. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))
- Invalid registration-token pages now show the invalid-token intro message without rendering the disabled registration form shell, and auth frameless layout padding/width handling now avoids the extra bottom box and horizontal scrollbar on auth pages. ([89cf0b5](https://github.com/le-firehawk/Cognis/commit/89cf0b5))
- Deleted users' email addresses were not released from `user_emails` (no cascade delete), causing "email already registered" errors on re-invite. Resolved by `006_user_emails_cascade` migration. ([381ad89](https://github.com/le-firehawk/Cognis/commit/381ad89))

- Registration gateway (`src/gateways/registration/`) with token-adapter flow (`src/adapters/registration/token/`): admins and founders can issue 24-hour, one-time registration invitations by email; admins can list/revoke all pending tokens; founders can list/revoke only their own pending tokens; founder issuers are capped at 20 active pending invites.
- Public invitation redemption flow at `/register` with `POST /api/v1/registration/redeem` and `GET /api/v1/registration/invite`, including invite preview text (`🎁 {inviterDisplayName} wants you to join Cognis`) and sender-audit binding (`accounts.invited_by_account_id`) performed at account creation.
- Admin-only founder flag endpoint `POST /api/v1/users/:username/isfounder` plus CLI command `cognisctl user:isfounder <username> <true|false>`.
- Administration → Registration section now fetches and displays all registration tokens (including used/revoked/expired) via `?includeClosed=true`; shows an italic placeholder when no tokens have been issued; pending tokens have an inline Revoke button. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))
- Invite button in Administration → Registration now navigates to `/users?action=invite`; the Users page auto-opens the invite popup when that URL parameter is present. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))
- Title Case rule added to AI instructions: all English page titles (keys ending in `page_title`), section headings (keys ending in `.title`), and navigation menu items (`ui.reuse.menu.*`) must capitalize every word. A new enforcement test `src/ui/tests/title-case.test.js` validates this for `en/strings.xml`. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))

### Changed

- Resend verification email in Users table no longer prompts for an email address; it automatically uses the user's primary unverified email. The "Resend Verification Email" option is hidden in the action menu when the user already has a verified primary email. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))
- Users table height is now adaptive to its content rather than a fixed seven-grid-unit default. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))
- Administration → Security section headings are now separated by dividers matching the Modules/Gateways style in Components. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))
- User Validation dropdown in Administration → Security now uses `theme-select` class for consistent dark/light theme styling. ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))

### Fixed

- API: admins can no longer disable their own account (`POST /api/v1/users/:username/disable` returns 409 when `username` matches the authenticated caller). ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))
- API: founder admin accounts (users with `isFounder && isAdmin`) cannot be demoted, disabled, deleted, or have their password reset by any other admin (returns 403). ([75be382](https://github.com/le-firehawk/Cognis/commit/75be382))

- Toast notification system (`src/ui/reuse/toast.js` + `src/ui/styles/reuse/toast.css`): non-blocking, auto-dismissing feedback messages with four appearance variants — `info`, `success`, `warning`, and `error`. Toasts stack at the top-right of the viewport, slide in with a spring animation, auto-dismiss after 4 s (info/success) or 7 s (warning/error), and can be dismissed manually via a close button. `showToast` is exported from `toast.js` and exposed on the `createPageComposer` return interface.
- All existing inline result messages replaced with `showToast` calls: email action errors in Settings General, test-email and debug-notification outcomes in Administration, login errors, and security-settings save success/failure. The inline `#email-status` div, the `#msg` login element, and the `.notif-debug-status` / `.provider-test-status` status spans are removed.
- Thorough second pass: replaced remaining info-only popup dialogs and silent failure paths with toasts. Email verification code errors (domain blocked, cannot-remove-primary), SMTP-no-email notification warning, and auth-adapter config save now use toasts. Profile page: avatar/banner upload failures, profile-edit save success/failure, and post-creation failure all show toasts. Administration adapter config save shows a success toast. AI instructions updated: `openPopup` is reserved for user decisions; all transient result feedback must go through `showToast`.

- Added a markdown-optimized AGPLv3 `src/ui/public/assets/reuse/license.md`, a dedicated authenticated `/license` UI page, and `GET /api/v1/system/license` for rendering license terms in-app. The global page composer now includes a thin footer (enabled by default, toggleable via `showFooter`) with a left-aligned License button linking to `/license`. Docs markdown loading was extracted to `src/ui/reuse/markdown-document.js` and reused by both docs and license pages. ([22f4640](https://github.com/le-firehawk/Cognis/commit/22f4640))
- License page now parses the AGPLv3 markdown into `##` sections rendered as individually collapsible `<details>` blocks with internal `overflow-y` scroll, and exposes a section navigation aside (via the toolbar) matching the docs page pattern. `license.md` is served from `src/ui/public/assets/reuse/` so Docker's `COPY src ./src` picks it up correctly.
- Docs API now accepts a `langs` query parameter (comma-separated language priority list) so the server iterates the user's full preferred-language chain before falling back to English. The docs UI passes `readPreferredLanguages()` as the `langs` value on every doc request. ([7ab5fe4](https://github.com/le-firehawk/Cognis/commit/7ab5fe4))
- `resolveLangs` extracted to `src/api/reuse/preferred-languages.ts` so the language-resolution logic is reusable across the API layer.
- AI instructions (`copilot-instructions.md`) now reference `src/docs/standard.en.md` as the authoritative guide for documentation section structure, depth tiers, and language requirements.

### Fixed

- Fixed `license.md` markdown section parsing so numbered list content from AGPL terms is not accidentally converted into section headings, and hardened docs markdown loading to fail gracefully when a doc fetch request fails. ([a8b0f2c](https://github.com/le-firehawk/Cognis/commit/a8b0f2c))
- `src/docs/api.ja.md` contained German text; replaced with a complete Japanese translation.
- `src/modules/docs/index.ja.md` contained outdated English text; replaced with a complete Japanese translation matching `index.en.md`.
- `src/modules/docs/index.de.md` contained outdated English text; replaced with a complete German translation.
- `src/modules/docs/index.id.md` contained outdated English text; replaced with a complete Indonesian translation.
- Translated all 31 English docs to German (de), Japanese (ja), and Indonesian (id): covers `src/docs/`, all gateway `docs/` subdirectories, all adapter `docs/` subdirectories, `src/modules/docs/`, and `src/tooling/docs/`. Every English doc now has a de, ja, and id counterpart. ([e35638b](https://github.com/le-firehawk/Cognis/commit/e35638b))
- Developer documentation: wrote or rewrote all 31 docs across `src/docs/`, gateway `docs/` subdirectories, adapter `docs/` subdirectories, `src/modules/docs/`, and `src/tooling/docs/`. Includes new `src/docs/standard.en.md` documenting the documentation writing standard. ([31e1ec4](https://github.com/le-firehawk/Cognis/commit/31e1ec4))

### Changed

- Default application font size reduced from 14 pt to 12 pt (`DEFAULT_FONT_SIZE` in `font-prefs.js`; `--app-font-size` CSS variable updated from `1.17rem` to `1rem`). ([0c06716](https://github.com/le-firehawk/Cognis/commit/0c06716))
- License page section parsing now splits `## Terms and Conditions` into individual sections based on AGPL `###` clause headings (0–17), so navigation and content are broken into meaningful legal units.
- License page now shows only the section selected from the navigation sidebar; collapsible `<details>` headers are removed. The viewpane has no height cap and no overflow scroll.
- AI instructions now include a firm rule requiring every UI page to be assembled through `createPageComposer`; bypassing the composer is explicitly prohibited.
- Founder action labels in Users updated: "Mark as founder" → "Add Founder Status"; "Remove founder status" → "Revoke Founder Status". ([d477185](https://github.com/le-firehawk/Cognis/commit/d477185))
- Registration gateway navbar plugin now checks `/api/v1/gateways/registration` before inserting the Invite menu item; the entry is suppressed when the gateway is disabled or unreachable. ([d477185](https://github.com/le-firehawk/Cognis/commit/d477185))
- Sensitive action re-prompt now asks the user to re-enter their password and verifies it server-side via a new `POST /api/v1/auth/verify` endpoint, replacing the previous word-match approach.
- User deletion now revokes all active access tokens for the deleted account, matching the behaviour already applied on disable.
- User deletion now performs a two-step purge (`local_auth_credentials` then `accounts`) so the username is reliably freed for re-registration across all supported database backends.
- Delete user confirmation popup now shows a permanent-deletion warning before the admin confirms.
- Invite error toast now shows a specific message when the supplied email address is already registered (`email_taken`), replacing the previous generic failure message.

### Fixed

- `theme.css`: `input`, `select`, `textarea`, and `button` now inherit `font-family` and `font-size` from `body`, so the user-selected application font is applied to all form controls. ([44dc8fd](https://github.com/le-firehawk/Cognis/commit/44dc8fd))
- SMTP adapter `getConfig()` now returns `user: this.config.user ?? ""` instead of `user: this.config.user` so the username field always appears in the admin config popup and is shown side-by-side with the password field, with both controlled by the Disable Authentication slider. ([38b815f](https://github.com/le-firehawk/Cognis/commit/38b815f))

### Added

- `src/adapters/file/local/manifest.json`: local file adapter manifest with `"locked": true`, mirroring the locked local auth adapter pattern. The local file adapter is permanently enabled and cannot be disabled.
- Files gateway (`src/gateways/files/bootstrap.ts`) now contributes `file:append(filePath, content)` capability in addition to `file:write` and `file:read`, so consumers can append to files without calling Node.js `fs` directly.
- Logging gateway (`src/gateways/logging/logger.ts`): `Logger` constructor now accepts an optional `fileAppend` parameter. When provided, all log-file writes go through the supplied function (the `file:append` capability from the files gateway) instead of calling `appendFile` directly. Falls back to native `appendFile` when the parameter is absent (test compatibility).
- DB gateway (`src/gateways/db/bootstrap.ts`) now owns executor creation, schema initialisation, and the modules-baseline insert. Contributes `db:executor`, `db:type`, and `db:dialect` to the capability store so all downstream gateways and `main.ts` obtain the executor and dialect helpers without direct adapter imports.
- `src/gateways/db/executor.ts`: canonical home for `SqliteExecutor`, `PostgresExecutor`, `MariadbExecutor`, `SupportedDbType`, and `createDbExecutor` (moved from `src/adapters/db/reuse/account-store.ts`).
- `src/gateways/db/init.ts`: canonical home for `initializeDatabaseSchema` and `resolveDbProviderDir` (moved from `src/api/bootstrap/db-init.ts`, which is now a re-export stub for backward compatibility).
- `DbLocalAccountStore` moved from `src/adapters/db/reuse/account-store.ts` to `src/adapters/auth/local/store.ts` — auth-specific persistence lives with the auth adapter.
- `src/gateways/auth/reuse/local-account-store.ts`: auth gateway's canonical re-export of the `LocalAccountStore` interface so `gateway.ts` no longer imports across the adapter boundary.
- Files gateway: contributes `file:write(path, content)` and `file:read(path)` capabilities in addition to `file:gateway`. Manifest updated to `required: true`.
- Logging gateway: `Logger` class moved from `src/api/logger.ts` to `src/gateways/logging/logger.ts` (owned by the logging gateway). `src/api/logger.ts` is now a re-export stub.
- Profile gateway bootstrap now creates and contributes `preferences:store`, removing the preference-store creation from `main.ts`.
- `db:dialect` helper (`DbDialectHelper` interface) contributed by the DB gateway provides dialect-aware `upsert` and `insertIgnore` operations, eliminating all per-dialect SQL branches from `main.ts`.

### Changed

- Logging gateway (`src/gateways/logging/bootstrap.ts`) reads the `file:append` capability from the capability store and passes it to the `Logger` constructor, routing all log persistence through the files gateway abstraction.
- Logging gateway manifest adds `"requires": ["files"]`, formalising the dependency on the files gateway. Version bumped to `1.2.0`.
- Files gateway manifest version bumped to `1.1.0` to reflect the new `file:append` capability.
- Gateway bootstrap sort order (`src/core/services/gateway-service.ts`) updated: files gateway bootstraps first (before logging) so its capabilities are available when the logging gateway initializes. Order is now files → logging → db → everything else alphabetically.
- `GatewayBootstrapContext.dbExecutor` and `.dbType` are now `optional` (`?`) and marked as deprecated. New gateway code should use `ctx.capabilities.get('db:executor')` and `ctx.capabilities.get('db:type')` instead.
- `main.ts` no longer creates the DB executor, runs schema init, or creates the preference store directly. All of these are now owned by the DB and profile gateways. Admin-state check and bootstrap-state write moved to after `gatewayService.bootstrap()`.
- `src/api/server.ts` `ApiDependencies.preferenceStore` is now optional.
- `createUserRoutes` accepts an optional `preferenceStore`; clearing preferences is a no-op when the store is absent.
- Auth gateway (`gateway.ts`) imports `LocalAccountStore` from `./reuse/local-account-store.ts` instead of from `../../adapters/auth/local/auth-adapter.ts`.
- Auth gateway bootstrap reads the DB executor from `ctx.capabilities.get('db:executor')` with fallback to `ctx.dbExecutor` for test backward compatibility.

### Fixed

- CI: corrected tsconfig project reference paths in `src/adapters/db/*/tsconfig.json` and `src/adapters/file/local/tsconfig.json` from `../../core` to `../../../core` so they resolve to `src/core` rather than the non-existent `src/adapters/core`. ([9080e62](https://github.com/le-firehawk/Cognis/commit/9080e62))
- Auth gateway: `/api/v1/auth/login` with `provider: "oidc"/"ldap"/"saml"` could authenticate through a registered-but-disabled adapter. The login handler now uses `getEnabledAdapter()` so only adapters in the enabled set are eligible. ([eb5d3f1](https://github.com/le-firehawk/Cognis/commit/eb5d3f1))
- Auth gateway: `profile:createProfile` was captured at bootstrap time (before the profile gateway has contributed it), causing new registrations and logins to silently skip profile-row creation. The capability is now looked up lazily inside the route handler. ([eb5d3f1](https://github.com/le-firehawk/Cognis/commit/eb5d3f1))
- Route registry: registered handlers for optional gateways (e.g. notify, profile) remained live after the gateway was disabled. `RouteRegistry` now stores an optional `gatewayId` alongside each handler and the server skips any entry whose gateway is marked disabled. ([eb5d3f1](https://github.com/le-firehawk/Cognis/commit/eb5d3f1))
- Administration page showed "Security" twice in the left nav and rendered an empty second section. The root cause was the auth gateway's admin section using `id: "security"` and `preferenceKey: "administration-security-layout"`, colliding with the base Security section. The auth section now uses `id: "authentication"` and `preferenceKey: "administration-auth-layout"` and is labelled "Authentication". ([aa008ec](https://github.com/le-firehawk/Cognis/commit/aa008ec))

### Added

- Adapter-to-adapter cross-gateway dependencies: adapter `manifest.json` files may now declare a `requires` field listing dependencies as `"gatewayId:adapterId"` or `"gatewayId"` strings. The auth and notify gateways read this field during adapter discovery and include it in the adapter list response. The admin Components panel enforces these dependencies when enabling an adapter: disabled gateway or adapter dependencies are listed in a confirmation popup and automatically enabled.
- `ui.app.admin.enable_confirm_adapter` i18n key added in all four language files (en, de, ja, id) for the adapter dependency enable confirmation popup.

### Changed

- Auth adapter config endpoint (`GET /api/v1/gateways/auth/adapters/:id/config`) now returns the standard flat config format `{ data, requiredFields }` (matching the notify adapter format) instead of `{ data: { schema, config } }`. This allows the generic adapter config popup in the Components panel to render auth adapter configuration forms correctly.
- `CoreAuthGateway.saveAdapterConfig` now extracts the `enabled` field from the config payload and calls `enableAdapter`/`disableAdapter` accordingly, consistent with how the notify gateway handles `enabled` in `saveProviderConfig`.
- `renderAdapterToggle` in the administration page now uses `adapter.senderId ?? adapter.id` for the adapter identifier and `adapter.active ?? adapter.enabled` for the enabled state, so auth adapters (which use `id`/`enabled`) display correctly alongside notify adapters (which use `senderId`/`active`).
- `renderInlineAdapters` now renders locked adapters with their toggle disabled, matching the Security section behaviour for the local auth adapter.
- `bindAdapterRows` now skips click-to-config for locked adapters.
- `bindAdapters` (renamed from `bindProviders`) in `admin-section.js` reflects internal naming conventions.
- Administration page Security section: the inline Save button is removed from the Trusted Email Domains form. Changes are now tracked by a floating Discard/Save bar (matching the Settings page pattern). The `initSecuritySection` interface gains `save()`, `discard()`, and an `onDirtyChange` callback parameter.

### Added

- `ui.app.admin.authentication` i18n key added in all four language files (en, de, ja, id) for the renamed Authentication admin section contributed by the auth gateway.

### Fixed

- `POST /api/v1/gateways/:id/enable` no longer returns 403 for required gateways. Only `disable` is blocked for required gateways; `enable` is permitted so that a required gateway that ended up persisted as disabled (e.g. due to an earlier state bug) can be recovered through the admin UI without a server restart.
- Auth adapter config popups in the Components panel no longer fail silently. The root cause was that auth adapter info uses `id`/`enabled` fields while the main panel expected `senderId`/`active`, causing the popup config URL to use `"undefined"` as the adapter ID.
- Local adapter now correctly shows as locked (toggle disabled) in the main Components panel.

- ([5a975f8](https://github.com/le-firehawk/Cognis/commit/5a975f8)) `uiDir` in auth, notify, and profile gateway bootstraps still referenced the removed `src/api/gateways/` path; `/static/gateways/{auth,notify}/admin-section.js` and `/static/gateways/profile/navbar.js` returned 404

### Added

- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/reuse/` — new shared utility directory; `tfa-code.ts` and `verify-token.ts` moved here from `src/api/utils/`, `read-json.ts` moved here from `src/api/routes/` (was a utility, not a route handler)
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/gateways/profile/routes/tests/helpers.ts` — shared `makeTempDb` fixture for profile gateway route tests, eliminating the duplicated function across `file-routes`, `post-routes`, and `social-routes` test files
- ([f27a824](https://github.com/le-firehawk/Cognis/commit/f27a824)) Regression tests for gateway UI file availability: auth and notify bootstrap tests verify `uiDir` resolves to a real directory and `admin-section.js` exists; profile bootstrap tests verify `uiDir` and `navbar.js`; UI route tests verify `/static/gateways/*/` static serving returns 200 for each gateway asset
- ([789f641](https://github.com/le-firehawk/Cognis/commit/789f641)) Regression tests for file-storage availability: `avatar PUT`, `avatar DELETE`, `banner PUT`, and `banner DELETE` each return `503 file_storage_unavailable` when the file gateway is absent, catching future regressions in the file-availability guard across all four mutating endpoints

### Changed

- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/tests/` — reorganised flat test files into domain subdirectories: `auth/`, `bootstrap/`, `docs/`, `gateways/`, `modules/`, `profile/`, `system/`, `ui/`, `users/`; `tfa/` subdirectory was already in place
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/routes/gateways/tests/gateway-routes.test.ts` moved to `src/api/tests/gateways/` — gateway route tests belong in the common API test tree, not inside the route handler directory
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/tests/{file,post,social,preferences}-routes.test.ts` moved to `src/gateways/profile/routes/tests/` — these tests cover profile gateway route handlers, not core API routes
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/tests/module-extension-routes.test.ts` moved to `src/modules/routes/tests/` — tests module-owned route code
- ([e2a9559](https://github.com/le-firehawk/Cognis/commit/e2a9559)) `src/adapters/db/shared/` renamed to `src/adapters/db/reuse/` — aligns with the codebase convention that cross-cutting utility directories are named `reuse/`, not `shared/`, `utils/`, or `helpers/`
- ([e2a9559](https://github.com/le-firehawk/Cognis/commit/e2a9559)) `src/gateways/tests/notification-gateway.test.ts` moved to `src/gateways/notify/tests/` — component-specific test belongs inside the notify gateway
- ([e2a9559](https://github.com/le-firehawk/Cognis/commit/e2a9559)) `.github/copilot-instructions.md` updated: "Shared UI logic" renamed to "Reusable code directories" and generalised; naming convention (`reuse/` over `shared/`/`utils/`) documented; stale test path example corrected

### Fixed

- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `issueAccessToken` called with a role string as the third argument (TTL) in `gateway-routes.test.ts`, `ui-registry.test.ts`, and `notify/bootstrap.test.ts`; corrected to `60` (seconds)

### Added

- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/tooling/scripts/gen-tsconfig.mjs` — auto-discovers all `composite: true` tsconfig.json files under `src/` and regenerates the root `tsconfig.json`; `npm run typecheck` now invokes this generator first, eliminating manually maintained project reference lists
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/reuse/element-registry.js` — page-element look-up registry (replaces `components/widget-registry.js`); exports `getElementDefinition`, `mergeElementConfig`, `getElementLibrary`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/reuse/font-prefs.js` — font catalog loading, picker construction, and settings-page font preference integration; promoted from `src/ui/app/settings/font-prefs.js`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `env.example` — full coverage of all environment variables; replaces `.env.example`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/public/assets/reuse/` — new asset directory for reusable SVG icons; `edit.svg` and `upload.svg` moved here from `assets/icons/`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/styles/reuse/layout.css` and `src/ui/styles/reuse/theme.css` — moved from `styles/base/` into `styles/reuse/` to consolidate all shared CSS under one directory

### Changed

- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `docker/Dockerfile` now declares defaults for `HOST`, `EXTERNAL_HOST`, `MEDIA_LOCATION`, `COGNIS_GATEWAYS_ROOT`, and `COGNIS_ADAPTERS_ROOT`; docker-compose files no longer provide fallback values for these variables
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/config/pages.js` — renamed `PAGE_WIDGET_LIBRARY` → `PAGE_ELEMENT_LIBRARY` and `widgets` → `elements` in `DEFAULT_PAGES`

### Removed

- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) Root `style.css` — unused 28,000-line monolith with no references in the codebase
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `.env.example` — superseded by `env.example`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/components/` directory — sole occupant `widget-registry.js` superseded by `src/ui/reuse/element-registry.js`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/styles/base/` directory — contents merged into `src/ui/styles/reuse/`

### Added

- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/core/services/gateway-service.ts` — new `GatewayService` class that discovers, bootstraps, and manages the gateway lifecycle, analogous to `ModuleService` for modules; subsumes `bootstrapGateways()` from `src/gateways/index.ts` and absorbs `GatewayRegistry`, `GatewayManifest`, `GatewayEntry`, `GatewayBootstrapBase`, `CapabilityStore`, and `BootstrapLog` into `@cognis/core`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/gateways/shared.ts` — common import barrel for gateway authors; re-exports `GatewayBootstrapContext`, `GatewayRegistry`, `CapabilityStore`, `BootstrapLog`, `requireAuth`, `getAuthClaims`, `getCookieSession`, `setPageSecurityHeaders`, and `readJson` so gateway subdirectories need only a single `../shared.js` import for the most common utilities

### Changed

- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) Structural file reorganization: rename adapter files, move docs, reorganize routes and interfaces
- Removed stale `COPY db ./db` from `docker/Dockerfile` — SQL migrations now live inside `src/adapters/db/<provider>/sql/` and are copied as part of `COPY src ./src`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/core/index.ts` now exports gateway types directly from `src/gateways/*/gateway.ts` and `src/modules/gateway.ts`; `GatewayService` and its supporting types are also exported from `@cognis/core`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/api/gateway-bootstrap.ts` slimmed to only `GatewayBootstrapContext` (the API-specific extension of `GatewayBootstrapBase`); re-exports `GatewayRegistry`, `CapabilityStore`, `BootstrapLog`, and `GatewayBootstrapBase` from `@cognis/core` for backward compatibility within the API layer
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/api/main.ts` now instantiates `GatewayService` and calls `gatewayService.bootstrap()` instead of the standalone `bootstrapGateways()` function
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) All gateway bootstrap files updated to import common utilities from `../shared.js`

### Removed

- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/core/gateways/` — five backwards-compatibility re-export shims deleted; all consumers now import directly from `@cognis/core` or the real source paths
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/gateways/index.ts` — standalone `bootstrapGateways()` function removed; equivalent logic lives in `GatewayService.bootstrap()`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/api/gateway-registry.ts` — `GatewayRegistry` class moved to `src/core/services/gateway-service.ts` and exported from `@cognis/core`

### Fixed

- Added `src/gateways/package.json` with `"type": "module"` so that gateway files are treated as ESM — without it, gateways moved from `src/api/gateways/` (which inherited ESM from `src/api/package.json`) to `src/gateways/` defaulted to CJS, breaking all named imports including `bootstrapGateways` at startup ([47eea07](https://github.com/le-firehawk/Cognis/commit/47eea07))
- Added `src/modules/package.json` with `"type": "module"` — without it, `src/modules/routes/module-extensions.ts` was treated as CJS, causing `SyntaxError: The requested module does not provide an export named 'createModuleExtensionRoutes'` at startup
- Updated root `tsconfig.json` project references to reflect the renamed adapter paths (`src/adapters/db/{sqlite,postgres,mariadb,memory}`, `src/adapters/file/local`) ([47eea07](https://github.com/le-firehawk/Cognis/commit/47eea07))

### Changed

- Moved all gateways from `src/api/gateways/` to a top-level `src/gateways/` directory, mirroring the `src/adapters/` layout; default `COGNIS_GATEWAYS_ROOT` updated accordingly ([e7f0413](https://github.com/le-firehawk/Cognis/commit/e7f0413))
- Moved db adapters from flat `src/adapters/db-*` directories into `src/adapters/db/<provider>/` (sqlite, postgres, mariadb, memory); `db-` prefix dropped ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))
- Moved db init/migrate SQL from top-level `db/init/<provider>/` and `db/migrate/<provider>/` into `src/adapters/db/<provider>/sql/init/` and `.../sql/migrate/`; `initializeDatabaseSchema()` now accepts an optional `adaptersRoot` parameter; top-level `db/` directory removed ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))
- Removed stale `src/adapters/auth-ldap/`, `auth-saml/`, and `auth-sso-oidc/` directories — code now lives under `src/adapters/auth/` ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))
- Moved `src/adapters/file-local/` to `src/adapters/file/local/` for namespace consistency ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))

### Added

- Auth gateway at `src/api/gateways/auth/` with `bootstrap.ts`, `gateway.ts`, and `manifest.json`; self-registers routes and capabilities via `routeRegistry` and `gatewayRegistry`
- Pluggable auth adapters: `local`, `ldap`, `saml`, and `oidc` under `src/adapters/auth/`; each adapter exposes `createAdapter()`, `getConfigSchema()`, and `configure()`
- `CoreAuthGateway` class managing adapter registry, enable/disable persistence, and adapter discovery from filesystem
- Auth gateway contributes `auth:accountStore`, `auth:createLocalAdmin`, and `auth:getLoginMethods` capabilities
- Admin section UI at `src/api/gateways/auth/ui/admin-section.js` for managing auth providers in the Administration page
- `GET /api/v1/auth/login-methods` endpoint returning enabled auth providers
- `GET/PUT /api/v1/gateways/auth/adapters/:id/config` and `POST /api/v1/gateways/auth/adapters/:id/enable|disable` admin endpoints
- DB migration `003_auth_adapter_configs.sql` for all three DB backends (sqlite, postgresql, mariadb)
- Login page now fetches login methods and renders a provider toggle for multi-provider login and SSO buttons for OIDC/SAML
- i18n keys for auth security admin section and login provider labels
- Tests for all new auth adapters and the auth gateway bootstrap

### Changed

- `authGateway` removed from `ApiDependencies` in `server.ts`; auth routes are now self-registered by the auth gateway via `routeRegistry`
- `accountStore` made optional in `ApiDependencies`; sourced from `auth:accountStore` capability after gateway bootstrap
- `buildServer` user routes are now conditionally created based on `accountStore` availability
- `main.ts` removes direct `LocalAuthGateway` and `DbLocalAccountStore` usage; admin account creation delegates to `auth:createLocalAdmin` capability after gateway bootstrap

### Changed

- `getCookieSession` and `setPageSecurityHeaders` extracted from duplicated private helpers in `routes/ui/index.ts` and `gateways/profile/bootstrap.ts` into `auth/guard.ts`; both call sites now import the shared functions ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- `as any` casts for `AccountRole` in `gateways/profile/bootstrap.ts` replaced with the exported `AccountRole` type ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- Dual `readRawBody`/`readJson` imports from the same module in `routes/profile/index.ts` merged into a single import statement ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- Comment in `main.ts` that named the profile gateway replaced with a gateway-agnostic description ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- CSS comments removed from `styles/base/layout.css` and `styles/base/theme.css` per codebase convention ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))

### Fixed

- Profile page routes (`/profile/:handle`) now return 404 when the profile gateway is disabled, preventing the profile SPA from loading while the gateway is off ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Gateway registry entries now carry the `requires` field from each gateway's `manifest.json`; previously, `requires` was read for dependency-validation only and never stored, so the admin UI always showed "No dependencies" for gateways with declared requirements ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Admin UI — dependency links in the gateway details panel now display the human-readable gateway name (e.g. "Database Gateway") rather than the raw ID (e.g. "db") ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))

### Changed

- Profile edit: saving a new display name now also writes `cognis_display_name` to `localStorage`, so the navbar name reflects the change without a full page reload ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Dashboard layout: `bindTopbarActions` now listens for `storage` events on `cognis_display_name` and updates `#profile-name` in real time, keeping the user menu consistent across in-page profile edits ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Admin UI: toggling a gateway now calls `updateNavbarAvatar()` immediately after reloading gateway state, so the Profile nav link appears or disappears without requiring a page navigation ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))

### Removed

- `src/ui/reuse/provider-config.js` deleted — the file was dead code (no consumers) and its route (`/api/v1/notifications/providers/…/config`) is a notify-gateway-specific endpoint that does not belong in core reuse; the equivalent logic is provided inline by `openAdapterConfig` in the administration page using the generic gateway adapter config API ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))

### Changed (architecture)

- Dashboard layout no longer calls profile-gateway routes directly (`/api/v1/profile/ping`, `/api/v1/profile`). Avatar and profile-link state are now supplied by a `registerAvatarProvider` hook that gateways register via a navbar plugin. The layout fetches registered plugins from `GET /api/v1/ui/navbar-plugins` and dynamically imports each one before the first avatar render ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))
- Profile gateway now self-registers its navbar plugin (`ui/navbar.js`) via `ctx.uiRegistry.registerNavbarPlugin`; the plugin provides the profile-ping + avatar-fetch logic that formerly lived in core `dashboard-layout.js` ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))
- `UIRegistry` extended with `NavbarPlugin` type, `registerNavbarPlugin(plugin)`, and `listNavbarPlugins()` methods; `GET /api/v1/ui/navbar-plugins` (user auth) added to the UI route handler ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))

- Gateway enable/disable state now persisted to the `gateways` DB table; state survives container restarts across all three DB providers (SQLite, MariaDB, PostgreSQL) ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- `POST /api/v1/gateways/:id/enable|disable` now returns `403 required_gateway` when the target gateway has `required: true`, preventing required gateways from being toggled ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Adapter enable endpoint (`POST /api/v1/gateways/:id/adapters/:adapterId/enable`) returns `409 gateway_disabled` when the parent gateway is disabled, preventing adapters from being enabled while their gateway is off ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Admin UI — required gateway sliders are rendered `disabled` (same as core/required modules), preventing accidental toggle ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Admin UI — adapter toggles are rendered `disabled` when the parent gateway is disabled ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Admin UI — `<summary>` elements in module and gateway rows now carry a `module-row-summary` class for targeted CSS vertical-alignment ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- CLI commands: `gateway:list`, `gateway:enable <gatewayId>`, `gateway:disable <gatewayId>` added to `cognisctl` under a new "Gateways" section ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))

- Gateway enable/disable: `GatewayRegistry` now tracks `status: "active" | "disabled"` per gateway with `enable(id)` and `disable(id)` methods; `POST /api/v1/gateways/:id/enable` and `POST /api/v1/gateways/:id/disable` (admin) toggle gateway state at runtime
- `GatewayManifest.hasAdapters?: boolean`: signals whether a gateway exposes a `/api/v1/gateways/:id/adapters` endpoint; notify gateway sets this to `true`; admin UI only fetches adapters for flagged gateways, eliminating 404 noise for non-adapter gateways
- Admin UI — Modules and Gateways now render as separate headed sections instead of a dropdown tab; gateway details show `required` (boolean) and adapter count; gateway rows include an enable/disable toggle matching the module pattern
- Admin UI — gateway detail shows a "Required" row (boolean) and a "Dependencies" row listing each gateway ID from `requires` as a clickable link that opens and scrolls to that gateway's row
- Admin UI — adapter config popup now maps backend field names to human-readable labels using existing SMTP i18n keys with camelCase fallback; `secure` field rendered as a dropdown (None / STARTTLS / TLS); `user`/`password` fields wrapped in `.provider-auth-fields` and hidden when `authDisabled` is checked
- Slider `<label>` elements for module and gateway toggles now carry a `title` tooltip via `ui.app.admin.toggle_module` / `ui.app.admin.toggle_gateway` i18n keys
- `CoreNotificationGateway.enableSender(id)` and `disableSender(id)` methods: toggle a sender's enabled state and persist the change without overwriting the rest of the adapter config ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))
- `POST /api/v1/gateways/:id/adapters/:adapterId/enable` and `.../disable` endpoints added to notify gateway adapter routes ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))
- `createProfileRoutes` accepts an optional `isGatewayEnabled?: () => boolean` callback; when supplied and returns `false`, `GET /api/v1/profile/ping` returns 503 so the dashboard hides the Profile link immediately after the profile gateway is disabled ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))
- i18n: `ui.reuse.generic.true`, `ui.reuse.generic.false`, `ui.reuse.generic.configure` keys added across all four language files ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))

### Changed

- Admin UI — module and gateway enable/disable sliders moved into `<summary>` (next to title); inline `onclick="event.stopPropagation()"` removed (CSP violation) — replaced by `bindSummarySliderClicks()` which attaches click listeners programmatically ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — gateway "Required" field now displays "True" / "False" text (via new i18n keys) instead of repurposing the Active/Disabled pill labels ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — adapter inline rows are now clickable (entire row opens the settings popup); "Configure" button removed; row has hover/focus styles; clicking the enable/disable toggle within the row does not open the popup ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — "Adapters" label shown above the inline adapter list (only when adapters are present) ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — SMTP adapter popup: `user`/`password` fields moved into the main `.provider-fields` grid (above the "Disable Authentication" toggle) rather than below it ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — SMTP adapter popup: `<select>` dropdown now fills the full width of its grid cell via `.provider-popup-field input, .provider-popup-field select { width: 100%; }` ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Notify gateway `ctx.gatewayRegistry.register()` call now includes `hasAdapters: true`; previously the field was absent, causing `loadAllAdapters()` to skip the notify gateway and show zero adapters in the admin UI ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — adapter row click handler now checks the whole `.switch--inline` label (not just the hidden `input` element), so clicking anywhere on the toggle track/knob correctly blocks the popup ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- Admin UI — expanded gateway/module view state now persisted to `sessionStorage` and restored on page refresh via `saveExpandedState()`, `restoreExpandedState()`, and `bindExpandedStateListeners()` ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- Gateway manifests bumped from `0.1.0` to `1.0.0`; corresponding version strings in bootstrap files updated to match ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- `db` gateway bootstrapped second (after `logging`) in `bootstrapGateways()` sort order so it is registered before any gateway that declares it as a required dependency ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))

### Added

- DB gateway (`src/api/gateways/db/`) — minimal gateway that registers itself in `GatewayRegistry` with `required: true`; allows notify and profile gateways to declare it as a dependency and ensures it appears in the admin UI with the correct required flag ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- Profile gateway manifest: added `"requires": ["db", "files"]`; notiy gateway manifest: added `"requires": ["db"]` ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))

### Fixed

- Admin UI — adapter inline toggle `isEnabled` condition fixed: previously `adapter.enabled !== false` evaluated `true` when `enabled` was `undefined`, causing the slider to always appear checked even after disabling an adapter; now uses `!!adapter.active` which correctly reflects the backend-reported state ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- `.switch--inline` — changed from `display: inline-flex` to `display: flex; height: 28px; line-height: 0` so the toggle is reliably vertically centred in the `<summary>` grid in all browsers ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- SMTP adapter `getConfig()` now includes `password: ""` so the password field always appears in the adapter settings form; `setConfig()` ignores empty-string password values to avoid overwriting a stored password when the user saves without re-entering it; `saveProviderConfig` strips empty password before persisting to avoid clearing the stored value ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- `bootstrapGateways()` sort comparator renamed parameters from `a`/`b` to `entryA`/`entryB` to eliminate single-letter variable ambiguity flagged by the readability lint check ([ee5ac2f](https://github.com/le-firehawk/Cognis/commit/ee5ac2f))
- `src/api/tests/docs-routes.test.ts`: updated slug assertions to match current directory structure (`components/docs/ui` instead of the stale `docs/components/ui`); both docs tests now pass

### Changed

- `src/components/docs/api.en.md`: documented new gateway API endpoints (`GET /api/v1/gateways`, `GET /api/v1/gateways/:id`, `GET /api/v1/admin/sections`), page-extensions route (`GET /api/v1/ui/page-extensions/:pageId`), and profile ping (`GET /api/v1/profile/ping`); noted `503` behaviour for avatar/banner when file gateway is absent
- `src/components/docs/overview.en.md`: added UIRegistry, auto-discovered adapters, and cross-gateway dependency declarations to Key Concepts
- `src/components/docs/versions.en.md`: added Gateways section with all four gateways (notify, profile, files, logging); renamed "Gateways (Core Contracts)" to "Core contracts"

### Added

- `src/api/ui-registry.ts` — `UIRegistry` class: gateways register admin-page sections (`{ id, label, scriptUrl }`) and static asset directories; core serves them without knowing gateway content
- `GatewayBootstrapContext.uiRegistry` optional field: gateways receive `UIRegistry` during bootstrap to self-register UI contributions
- `GET /api/v1/admin/sections` route (admin): returns list of admin sections registered by gateways via `UIRegistry`
- `UIRegistry.registerPageExtension(pageId, element)` / `listPageExtensions(pageId)`: gateways inject `PageElement` contributions into any named core page
- `GET /api/v1/ui/page-extensions/:pageId` route (authenticated): returns page extensions contributed by gateways for the given page; used by core pages to dynamically load gateway-contributed UI modules
- `GatewayManifest.requires?: string[]`: declares mandatory inter-gateway dependencies; cross-dependency violations for required gateways now throw before server start; optional gateways log a warning when a dependency is absent

### Changed

- `src/api/gateways/index.ts` `bootstrapGateways()`: reads `requires` from each gateway's `manifest.json`; validates cross-gateway dependencies after all gateways have bootstrapped; throws for missing required-gateway deps, logs warning for optional-gateway deps
- `src/api/main.ts`: removed unused `logger` variable (type `Logger` was undeclared; `log` via `BootstrapLog` is the correct interface)

### Tests

- `src/api/tests/ui-registry.test.ts`: new — UIRegistry unit tests (admin sections, static dirs, page extensions, route handler for `GET /api/v1/ui/page-extensions/:pageId`)
- `src/api/tests/profile-routes.test.ts`: added — `GET /api/v1/profile/ping` returns 200/401; avatar PUT returns 503 without fileGateway
- `src/api/routes/gateways/tests/gateway-routes.test.ts`: added — `GET /api/v1/admin/sections` auth and content tests
- `src/api/gateways/tests/gateway-registry.test.ts`: added — `GatewayManifest.requires` field, `assertRequiredInitialized` success and failure cases

- `/static/gateways/:gatewayId/...` static file handler: serves gateway-owned UI assets from filesystem paths registered via `UIRegistry.registerStaticDir()`
- `GET /api/v1/profile/ping` route: lightweight capability-check endpoint; returns `{ data: { available: true } }` when the profile gateway is present
- `src/api/gateways/notify/ui/admin-section.js` — browser ES module: contributes the Notifications debug panel to the admin page via the `UIRegistry` mechanism
- Profile gateway now registers `createProfilePageRoutes()` for `GET /profile` and `GET /profile/:handle`, owning its own page-serving routes

### Changed

- `notify/bootstrap.ts`: registers notification gateway admin section and static UI directory with `UIRegistry` at end of bootstrap; renamed ambiguous `key` variable from `verifyTokenService.verify()` to `userEmailPair`
- `routes/profile/index.ts`: `fileGateway` parameter made optional; avatar/banner/banner-delete routes return `503 file_storage_unavailable` when file gateway is absent
- `gateways/profile/bootstrap.ts`: profile API routes always registered (with optional fileGateway); file routes only registered when file gateway is present; `/profile` and `/profile/:handle` page routes owned by profile gateway via `createProfilePageRoutes()`
- `routes/ui/index.ts`: removed hardcoded `/profile` and `/profile/:handle` routes (now owned by profile gateway); added `/static/gateways/:id/...` gateway static file handler; accepts optional `uiRegistry?` parameter
- `routes/gateways/index.ts`: added `GET /api/v1/admin/sections`; accepts optional `uiRegistry?` parameter
- `server.ts` `ApiDependencies`: added `uiRegistry?` field; passed to `createUiRoutes` and `createGatewayRoutes`
- `main.ts`: creates `UIRegistry` instance and passes it to `bootstrapGateways` context and `buildServer`
- `ui/app/administration/index.js`: removed hardcoded `Notifications` section and SMTP-specific `renderSmtpPopupBody`; added `loadAdminSections()` and `loadGatewaySection()` for dynamic section discovery; added generic `renderGenericAdapterForm` (derives field types from API-returned descriptors); toolbar nav and elements array built dynamically from registered gateway sections
- `ui/layouts/dashboard-layout.js` `updateNavbarAvatar()`: pings `/api/v1/profile/ping` first; Profile menu link conditionally shown/hidden based on gateway availability
- `ui/public/templates/dashboard-layout.html`: Profile menu `<li>` hidden by default with `data-profile-link` attribute; revealed dynamically when profile gateway is present
- `ui/tests/dead-code.test.js`: `USAGE_ROOTS` extended to include `src/api/gateways` so gateway-contributed browser JS is scanned for CSS class references
- `api/tests/ui-routes.test.ts`: updated profile-page test to assert core `createUiRoutes` no longer handles `/profile` (now owned by profile gateway)

- `src/api/gateways/profile/` — profile gateway (optional). Owns `DbProfileStore` schema, profile/social/post/file routes and file-size-limits admin routes. Reads `file:gateway` from capabilities (avatar/banner/file routes registered only when the file gateway is present). Contributes `profile:createProfile` and `profile:setRoleByHandle` callbacks so auth and user routes can stay profile-agnostic ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `BootstrapLog` type in `gateway-bootstrap.ts`: standard `(level, message, meta?) => void` signature; optional `log?` field added to `GatewayBootstrapContext` so gateways can emit structured logs during bootstrap ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `DbInitLogger` interface in `bootstrap/db-init.ts`: minimal `info(msg, meta?)` contract for the database initializer, replacing the hard import of the concrete `Logger` class ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))

### Changed

- `gateways/index.ts` `bootstrapGateways()`: sorts gateways so the logging gateway always runs first; after the logging gateway initializes, `ctx.log` is populated from `logging:log` for all remaining gateways ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `server.ts` `ApiDependencies`: removed `profileStore`, `fileGateway`; added `log?`, `createProfile?`, `setProfileRole?` — all plain callback types with no adapter imports. `buildServer` now delegates logging to the injected `log` function (no-ops when absent) ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `routes/auth/index.ts`: replaced `ProfileCreateStore` import and `profileStore?` parameter with a plain `createProfile?` callback — auth routes carry zero profile dependency ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `routes/users/index.ts`: replaced `ProfileCreateStore` import and `profileStore?` parameter with `setProfileRole?` callback. User-create route no longer calls `createProfile` (profile gateway creates profiles on first login instead) ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `main.ts`: removed `Logger` and `DbProfileStore` imports; removed direct `profileStore` bootstrap; removed `fileGateway` retrieval. Pre-gateway logging uses a minimal inline `bootstrapLog()` console writer. After gateway bootstrap, `log` and `createProfile`/`setProfileRole` are read from `CapabilityStore` and injected into `buildServer` ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))

### Added

- `GatewayBootstrapContext` interface and `CapabilityStore` class in `src/api/gateway-bootstrap.ts`: standard contract for all gateway bootstrap functions; gateways contribute capabilities (e.g. `file:gateway`) back to core without core importing any concrete class ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `GatewayManifest.required` field: gateways can declare themselves required; `GatewayRegistry.assertRequiredInitialized()` throws if any required gateway failed to register, causing core to refuse startup ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `src/api/gateways/index.ts` `bootstrapGateways()`: auto-discovers gateway subdirectories, reads each `manifest.json` for required flag, and dynamically imports each gateway's standard `bootstrap(ctx)` entry point ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `src/api/gateways/notify/` directory: notification gateway moved from flat files to self-contained subdirectory; `bootstrap.ts` now also owns and registers all user email management routes (`/api/v1/users/:id/emails/*`, `/api/v1/verify-email`, `/api/v1/verify-tokens/status`) that previously leaked into core user routes ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `src/api/gateways/files/` directory: local file storage gateway now bootstraps itself, reads `MEDIA_LOCATION` from env, and contributes `file:gateway` to the capability store — core never imports `LocalFileGateway` directly ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `manifest.json` for `notify` and `files` gateways (both `required: false` by default) ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- Tests for `assertRequiredInitialized`, notify bootstrap registration, and email management routes in `src/api/gateways/notify/tests/` ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))

### Changed

- `main.ts` no longer imports any concrete gateway or adapter class; calls `bootstrapGateways()` blindly then performs the required-gateway startup check before the server starts listening ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `ApiDependencies` in `server.ts` stripped of `notifStore`, `tfaService`, `verificationEmailSender`, `verifyTokenService`, and `externalHost`; `fileGateway` is now sourced from the capability store ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `createUserRoutes` reduced to pure user CRUD (create, role, password, enable, disable, delete, preferences/clear); email management routes moved to notify gateway ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- Email-verification tests relocated from `src/adapters/notify/smtp/tests/` to `src/api/gateways/notify/tests/email-routes.test.ts` to match route ownership ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))

### Removed

- `src/api/gateways/notification.ts`, `notification-bootstrap.ts` — replaced by `notify/gateway.ts` and `notify/bootstrap.ts` ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))

### Added

- `GatewayRegistry`: registry service for gateway self-registration with metadata ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `RouteRegistry`: pluggable route handler registry; gateways self-register routes instead of being hardcoded in `server.ts` ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `bootstrapNotificationGateway()` in `notification-bootstrap.ts`: notification gateway now bootstraps itself (creates stores, discovers adapters, registers routes) without `main.ts` or `server.ts` knowing about specific gateway internals ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `GET /api/v1/gateways` and `GET /api/v1/gateways/:id`: gateway management API (admin-only) ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `GET /api/v1/gateways/notify/adapters`, `GET/PUT /api/v1/gateways/notify/adapters/:id/config`, `POST /api/v1/gateways/notify/adapters/:id/test`: unified gateway adapter API registered by the notification gateway itself ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Administration page "Components" section with Modules/Gateways/Adapters dropdown, replacing the flat "Modules" section ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Adapter configuration management moved from the Notifications section into Components → Adapters ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Tests for `GatewayRegistry`, gateway routes (`GET /api/v1/gateways`), and `bootstrapNotificationGateway` ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- i18n keys for `ui.app.admin.components`, `ui.app.admin.gateways`, `ui.app.admin.adapters`, `ui.app.admin.description`, `ui.app.admin.no_gateways`, `ui.app.admin.no_adapters` in all four supported languages ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))

### Changed

- `server.ts` `ApiDependencies`: `notificationGateway` removed; `routeRegistry` and `gatewayRegistry` added; server is now unaware of specific gateway implementations ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `main.ts` delegates notification gateway lifecycle to `bootstrapNotificationGateway()`; no longer directly constructs `CoreNotificationGateway` or its stores ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Administration Notifications section now shows only the debug dispatch panel; provider config lives in Components → Adapters ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))

- `VerificationEmailSender` interface; gateway is now the sole authority for verification emails ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Per-provider enable/disable flag persisted through the gateway config store ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Docs auto-discovery: route scans for `docs/` directories anywhere under `src/` ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Component versioning document at `src/components/docs/versions.en.md` ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- SMTP adapter relocated to `src/adapters/notify/smtp/`; tests co-located inside `tests/` subdirectory ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))

### Changed

- Prettier 3.8.3 adopted as the canonical code formatter (inferred from IDE auto-format samples): 4-space indent, double quotes, trailing commas in multi-line argument lists ([4f0eab0](https://github.com/le-firehawk/Cognis/commit/4f0eab0))
- `lint-placeholder.mjs` replaced with Prettier `--check` invocation; `lint-readable.mjs` indentation check removed (now covered by Prettier)
- All source files (JS, TS, HTML, CSS) reformatted to match the Prettier standard
- All route files restructured to `routes/<domain>/index.ts` pattern ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Notification gateway renamed from `notification-gateway.ts` to `notifications.ts` (redundant suffix removed) ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Component docs reorganised: `src/docs/components/` → `src/components/docs/`, `src/docs/modules/` → `src/modules/docs/`, `src/docs/standards/` → `src/tooling/docs/`
- AI instructions updated with CHANGELOG, CHANGELOG compression convention, and general gateway/adapter authority principle

### Removed

- `src/docs/foundation-log.md` (internal session log, not product documentation)
- Flat `*-routes.ts` files replaced by domain-subdirectory route handlers ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))

### Fixed

- `dispatch()` in notification gateway now catches per-sender errors rather than propagating ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Email UNIQUE constraint now enforced in all DB init scripts ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- `discoverSenders` now scans `adaptersRoot/notify/` instead of `adaptersRoot/`, correctly resolving the two-level `src/adapters/<gateway-id>/<adapter-id>/` structure

[Unreleased]: https://github.com/le-firehawk/Cognis/compare/HEAD...HEAD
