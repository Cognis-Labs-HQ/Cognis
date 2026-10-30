# API

## Bounded Snapshot Replacements

A successful replacement that exceeds the read-cache byte limit, or has no serializable value, retires its old snapshot instead of leaving obsolete data available offline. A late coalesced read cannot repopulate that retired snapshot. Other cached keys remain available, and oversized responses remain usable online without being cached.

## Account ID Notification Delivery

Role-targeted notifications and Study Library request/content notifications address recipients by immutable `accountId`, preserving delivery to SSO users whose public usernames differ. Request decisions exclude the acting account by the same ID; public usernames remain display data.

## Acknowledged Preference Snapshots

Successful Profile preference writes update their bounded, provider-owned read snapshot before later reads, including replay and online-only saves. Offline preference merges retain acknowledged fields and project remaining pending changes. Delayed reads cannot overwrite a newer acknowledged snapshot; account changes, provider disposal and failed writes cannot publish stale data.

## Overview

`src/api/` is the HTTP layer of Cognis. It hosts the Express-compatible Node.js server, the route registry, authentication middleware, and all the thin route handler modules that map incoming HTTP requests to gateway operations. The API layer is intentionally kept thin: route handlers parse and validate input, delegate to gateways, and return a stable response envelope. No route handler holds a direct reference to a database driver or external service SDK.

The server is assembled from what is present at startup rather than from a hardcoded component list. Gateways register their own routes during bootstrap via `ctx.routeRegistry.register(...)`. The server iterates the registry to build its route table. Removing a gateway removes its routes automatically.

Authentication uses opaque bearer tokens issued at login. The same token is also set as an HttpOnly cookie (`cognis_access_token`) for server-rendered page guards. The cookie uses `SameSite=Lax`, sets `Max-Age` to match token TTL, and applies `Secure` when TLS is detected (`x-forwarded-proto=https`) or `COGNIS_SECURE_COOKIES=true`. A non-expiring CLI bootstrap token is written to disk at startup for trusted local tooling.

## Responsibilities

- Host the HTTP server and wire the route registry into request handling.
- Provide `requireAuth` and `getAuthClaims` middleware used by all protected route handlers.
- Enforce the `{ data }` / `{ error }` response envelope convention.
- Bootstrap all gateways in dependency order via `src/api/bootstrap/gateway.ts`.
- Initialize the database schema at startup via `src/api/bootstrap/db-init.ts`.
- Provide reuse utilities for route handlers: `src/api/reuse/`.

Not responsible for: implementing any domain logic, storing data directly, or knowing which gateways are installed.

## Architecture

### Response envelope

All API responses use one of two shapes:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Requires admin scope" } }
```

Internal error details are never sent to the client. Server-side logging captures the full error context.

### Auth model

Obtain a token via `POST /api/v1/auth/login`. The response includes `data.token`. Send the token as `Authorization: Bearer <token>` on subsequent requests. The login endpoint also sets `cognis_access_token` as an HttpOnly cookie for server-rendered route guards.

Token expiry is controlled by `COGNIS_ACCESS_TOKEN_TTL_SECONDS` (default: `43200`, twelve hours). At startup the server writes a non-expiring CLI bootstrap token to `COGNIS_CLI_TOKEN_PATH` (default `/app/config/cli-access.token`, mode `0600`) for trusted local CLI usage.

### Persistence defaults

| `DB_TYPE`              | Backend    | Connection              |
| ---------------------- | ---------- | ----------------------- |
| `postgresql` (default) | PostgreSQL | `DATABASE_URL` required |
| `mariadb`              | MariaDB    | `DATABASE_URL` required |

### Key source locations

| Path                                 | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `src/api/main.ts`                    | Server entry point                                     |
| `src/api/server.ts`                  | HTTP server setup and route dispatch                   |
| `src/api/reuse/route-registry.ts`    | Route registry used by gateways to self-register       |
| `src/api/bootstrap/gateway.ts`       | Gateway bootstrap context and bootstrap contracts      |
| `src/gateways/auth/guard.ts`         | `requireAuth`, `getAuthClaims` middleware              |
| `src/gateways/auth/access-tokens.ts` | Token issuance and validation                          |
| `src/api/bootstrap/db-init.ts`       | Schema initialization at startup                       |
| `src/api/reuse/`                     | Shared utilities (crypto, JSON reading, store helpers) |

## Configuration

| Variable                          | Default                        | Description                                             |
| --------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                   | Database backend: `postgresql` or `mariadb`             |
| `DATABASE_URL`                    | —                              | Connection string for PostgreSQL or MariaDB             |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | Bearer token lifetime in seconds                        |
| `COGNIS_CLI_TOKEN_PATH`           | `/app/config/cli-access.token` | Path for the CLI bootstrap token                        |
| `COGNIS_MODULE_SOURCES_PATH`      | `config/module-sources.json`   | Persistent module marketplace source configuration path |
| `COGNIS_GATEWAYS_ROOT`            | `src/gateways`                 | Root directory for gateway discovery                    |
| `COGNIS_ADAPTERS_ROOT`            | `src/adapters`                 | Root directory for adapter discovery                    |
| `PORT`                            | `3000`                         | HTTP port                                               |
| `LISTEN_HOST`                     | `0.0.0.0`                      | Bind address                                            |

## API Routes

### System

| Method | Path                         | Description                          | Auth   |
| ------ | ---------------------------- | ------------------------------------ | ------ |
| `GET`  | `/api/v1/system/health`      | Full health status with uptime       | None   |
| `GET`  | `/api/v1/system/healthcheck` | Minimal liveness probe               | None   |
| `GET`  | `/api/v1/system/languages`   | List installed UI languages          | None   |
| `GET`  | `/api/v1/system/ui-config`   | UI configuration object              | None   |
| `GET`  | `/api/v1/system/security`    | Read trusted email domain settings   | Bearer |
| `PUT`  | `/api/v1/system/security`    | Update trusted email domain settings | Admin  |
| `GET`  | `/api/v1/system/license`     | Retrieve license markdown payload    | None   |

### Auth

| Method | Path                         | Description                        | Auth |
| ------ | ---------------------------- | ---------------------------------- | ---- |
| `GET`  | `/api/v1/auth/login-methods` | List enabled auth providers        | None |
| `POST` | `/api/v1/auth/register`      | Self-register; issues `user` role  | None |
| `POST` | `/api/v1/auth/login`         | Authenticate; returns bearer token | None |

### Modules

| Method | Path                          | Description      | Auth   |
| ------ | ----------------------------- | ---------------- | ------ |
| `GET`  | `/api/v1/modules`             | List all modules | Bearer |
| `POST` | `/api/v1/modules/:id/enable`  | Enable a module  | Admin  |
| `POST` | `/api/v1/modules/:id/disable` | Disable a module | Admin  |

### Gateways

| Method | Path                           | Description                     | Auth  |
| ------ | ------------------------------ | ------------------------------- | ----- |
| `GET`  | `/api/v1/gateways`             | List all registered gateways    | Admin |
| `GET`  | `/api/v1/gateways/:id`         | Single gateway manifest         | Admin |
| `POST` | `/api/v1/gateways/:id/enable`  | Mark gateway active             | Admin |
| `POST` | `/api/v1/gateways/:id/disable` | Mark gateway disabled           | Admin |
| `GET`  | `/api/v1/admin/sections`       | Admin UI sections from gateways | Admin |

### UI extensions

| Method | Path                                 | Description                           | Auth   |
| ------ | ------------------------------------ | ------------------------------------- | ------ |
| `GET`  | `/api/v1/ui/page-extensions/:pageId` | Page elements contributed by gateways | Bearer |

### Docs

| Method | Path                           | Description                   | Auth |
| ------ | ------------------------------ | ----------------------------- | ---- |
| `GET`  | `/api/v1/docs`                 | List all available doc slugs  | None |
| `GET`  | `/api/v1/docs/:slugOrTreePath` | Retrieve a single doc by slug | None |

### Profile

| Method   | Path                                   | Description                          | Auth   |
| -------- | -------------------------------------- | ------------------------------------ | ------ |
| `GET`    | `/api/v1/social/profile/ping`          | Capability check                     | Bearer |
| `GET`    | `/api/v1/social/profile`               | Own profile                          | Bearer |
| `PATCH`  | `/api/v1/social/profile`               | Update own profile fields            | Bearer |
| `PUT`    | `/api/v1/social/profile/avatar`        | Upload avatar                        | Bearer |
| `DELETE` | `/api/v1/social/profile/avatar`        | Remove own avatar                    | Bearer |
| `PUT`    | `/api/v1/social/profile/banner`        | Upload banner                        | Bearer |
| `DELETE` | `/api/v1/social/profile/banner`        | Remove own banner                    | Bearer |
| `GET`    | `/api/v1/social/users/:handle/profile` | Public profile (gated by visibility) | Bearer |

### Social graph

| Method   | Path                                     | Description                          | Auth   |
| -------- | ---------------------------------------- | ------------------------------------ | ------ |
| `POST`   | `/api/v1/social/users/:handle/follow`    | Follow a user                        | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/follow`    | Unfollow                             | Bearer |
| `POST`   | `/api/v1/social/users/:handle/block`     | Block a user                         | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/block`     | Unblock                              | Bearer |
| `GET`    | `/api/v1/social/users/:handle/follow`    | Follower list (gated by visibility)  | Bearer |
| `GET`    | `/api/v1/social/users/:handle/following` | Following list (gated by visibility) | Bearer |

### Posts

| Method   | Path                                 | Description                              | Auth   |
| -------- | ------------------------------------ | ---------------------------------------- | ------ |
| `POST`   | `/api/v1/social/posts`               | Create post                              | Bearer |
| `GET`    | `/api/v1/social/posts`               | List own posts                           | Bearer |
| `DELETE` | `/api/v1/social/posts/:id`           | Delete post (owner, moderator, or admin) | Bearer |
| `GET`    | `/api/v1/social/users/:handle/posts` | List a user's posts                      | Bearer |

### Files

| Method   | Path                                         | Description                   | Auth   |
| -------- | -------------------------------------------- | ----------------------------- | ------ |
| `PUT`    | `/api/v1/files/:bucket/:key`                 | Upload a file                 | Bearer |
| `GET`    | `/api/v1/files/:bucket/:key`                 | Download a file               | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key`                 | Delete a file                 | Admin  |
| `GET`    | `/api/v1/social/admin/file-limits`           | List per-category size limits | Admin  |
| `PUT`    | `/api/v1/social/admin/file-limits/:category` | Set a size limit              | Admin  |

### Users (admin)

| Method   | Path                              | Description        | Auth  |
| -------- | --------------------------------- | ------------------ | ----- |
| `GET`    | `/api/v1/users`                   | List accounts      | Admin |
| `POST`   | `/api/v1/users/:username/role`    | Set account role   | Admin |
| `POST`   | `/api/v1/users/:username/disable` | Disable an account | Admin |
| `POST`   | `/api/v1/users/:username/enable`  | Enable an account  | Admin |
| `DELETE` | `/api/v1/users/:username`         | Delete an account  | Admin |

## Reachability

`GET /api/v1/system/healthcheck` returns `{ "data": { "status": "ok" } }` immediately, without running component contributors. This is the liveness endpoint used for connectivity detection. `GET /api/v1/system/health` retains detailed component health, timestamps and uptime. A slow optional component must not make an available server appear offline.

## Offline route readiness

`offline:registerSessionRoutes(ids, signal, { available })` accepts an optional owner predicate called with the route and path while offline. Disposing its signal removes the declaration. The host separately prepares public page code and styles through `offline:prepareRouteAssets`; `offline:areRouteAssetsReady` reports completion. `createOfflineReadCache` exposes `read.has(key)`, and scoped HTTP clients expose `request.hasCachedRead(path)`, without returning private data. These checks include account/session identity, expiry, cache generation and provider lifetime. They do not grant authorization or waive cached legal consent.

## Login and queued delivery

Outbox replay starts in the background only after successful session authorization and required consent. A separate browser delivery lock serializes replay across tabs; short storage locks protect snapshots and acknowledgements without waiting for network delivery. Reads and new queued writes remain usable during a slow replay, and acknowledgements re-read storage so concurrent writes survive. Empty queues are not rewritten during authentication; unauthenticated pages do not warn about another account’s buffer.

## Offline checks and warnings

The Offline Mode banner offers Recheck Connectivity with shared button styling and a busy state. It immediately calls `/api/v1/system/healthcheck`, coalesces simultaneous checks, then reauthorizes the session and attempts queued delivery when the server is reachable. Required consent still gates replay. Failure keeps Offline Mode active without an error popup. Automatic checks remain limited to once every fifteen minutes; this explicit action can run sooner. Refresh remains available after recovery.

The native close/reload guard covers protected records newly created in the current page and session. A real reload starts with that guard clear while preserving queued records for replay; new meaningful edits arm it again. Viewed Study markers and analytics are background activity and do not arm it. Other tabs’ records, previously persisted records and merely rendering pages do not create a warning. Provider disposal keeps current-page edits protected until delivery or removal.

## Refresh unlocks and module loading

Unlocks survive refreshes in the same authenticated tab/session. The password still encrypts the vault; neither a password nor a plaintext decryption key is persisted. Session storage holds only an AES-GCM encrypted unlock, wrapped using HKDF from the active session secret and bound to origin, account, server account-instance and session identity. The server must verify that binding before restoration. Finite relock deadlines are authenticated and remain absolute across refreshes. Explicit Lock, logout, account/instance/session changes and expiry invalidate restoration. Closing the tab or starting a new session requires unlocking again. The retired plaintext IndexedDB cache remains disabled.

Host route-asset preparation registers its flow and cache capabilities once per shared ctx. Bundled scripts and source imports from external modules reuse the same registrations and prepared-route state, so opening Meetings no longer fails with a duplicate `offline:prepareRouteAssets` flow.

## Shared top banners

The host exposes `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` before providers or pages mount. Descriptors accept a plain-text `title`, sanitized `bodyHtml`, trusted `actionsHtml` and an `info`, `success`, `warning` or `danger` variant. The returned handle has `element` and `remove()`. Reusing an ID replaces only that owner’s notice; an older disposer cannot remove its replacement. Bind provider/page lifetimes with `signal`. Lower priorities appear first. Titles are escaped; callers must sanitize rich text. Shared top banners retain an opaque, theme-aware background while scrolling. Restored-connection, warning and danger notices use the existing theme colors.

Offline Mode and Broadcast now use one sticky stack at the very top of the document, above the app header. Offline Mode has priority, cannot be dismissed, and retains Recheck Connectivity and the recovered Refresh action. Removing or dismissing an announcement does not remove Offline Mode. Broadcast polling skips disconnected requests and its provider disposes its bar and timer.

## Empty offline Study pages

Prepared Study pages remain navigable in a verified, consented offline session even without private content snapshots. Missing language/preference metadata produces empty navigation data. Explore mounts its normal empty browser and shows “No offline cached content available” instead of route-unavailable feedback or error toasts. Flashcards also retains an empty page when deck data or a required view resource is missing. Notices are scoped to the current page and deduplicated. Cache misses do not conceal access or consent denials. Library and flashcard providers prepare their public translations and light templates online; private data stays in the bounded tab-local caches.

## Direct Loads and Styles

Direct loads and refreshes retain their route styles while offline assets prepare. Host and component builds preserve stylesheet source identity, and logical and emitted URLs share ownership. Asset responses no longer wait for background cache writes; failures are logged and do not delay delivery. Web fonts load separately from the theme, so an unavailable font server cannot block the page or loading wheel. The selected font still applies when available, with the existing browser fallback while it loads.

## Public Asset Preparation

The host exposes `ctx.capabilities.get("offline:assets")` with `prepare(paths, { signal })` and `register(paths, { signal })`. Both use the staged `offline:prepareAssets` flow. Registration starts background preparation, retries on connectivity/preference changes and returns a retry function. Only root-relative public `/static/` or `/assets/` paths are accepted; requests omit credentials and reject private/no-store responses. Four workers consume response bodies, concurrent requests coalesce per owner signal, failures remain retryable, and aborting the owner cancels work and listeners. This facility caches no private API data and grants no offline access. Component `restoreRead` callbacks in the offline HTTP client run only after an authorized cache miss and use the same guarded snapshot reader. Access denials are never converted into empty or queued views.

Preparation remains idle while Offline Mode is disabled, disconnected or blocked by required consent. Registration also retries after consent updates and worker controller changes. Successful work is scoped to the current owner and worker; preparing with no controller does not prevent rewarming when the worker takes control.

## Durable Queued Results

Once a write is durably queued, optional activity capture or view-refresh failures do not turn it into a failed write. Calendar can open details from cached event lists, including newly queued events and later pending edits. Concurrent event submissions share one request. Messages clear their draft only after acknowledgement or persistence; room-refresh failures preserve that receipt. Profile text, posts and images likewise retain their completed result when a view refresh fails. Availability refreshes cannot hold up completed Calendar writes.

Provider lifecycle failures now record the failing script path without query data and whether importing or mounting failed. Optional activity failures are logged separately from the durable user action.

## Offline Availability

The offline route registry survives repeated bundled and directly served imports. Prepared route descriptors retain availability when reconstructed with the same script, styles and capability providers; changed assets require preparation again. Messages prepares its room list, translations and emoji catalogs after verified sign-in. The page can open offline before its first online visit; only cached rooms with cached threads open automatically, and selecting an uncached thread gives a targeted information toast. Explore keeps available cached collections when another collection or viewed-marker snapshot is missing. Access and consent denials still propagate. Banner actions sit directly in the shared action row, removing the inherited vertical offset.

## Shared Study Favourites

The Study provider exposes `study:favourites` with scoped `load`, `toggle` and `has` operations. Rendering utilities resolve this ctx capability instead of keeping a separate cache for each loader. Favourites prepare after verified authentication, overlay pending changes and share account/session-bound state across Explore, flashcards and repeated imports. Missing optional favourite snapshots produce an empty selection with queued changes applied; they do not hide cached content or show an update-failed toast. Account changes clear the visible selection and access denials are never treated as cache misses.

## Cached Public Resources

Shared reuse styles, including toasts and secret visibility controls, are included in the worker boot manifest in both logical and built forms. Calendar prepares its lazy status stylesheet through its provider. The SPA route catalog is shared through ctx across bundled and directly served imports, preserving authorized Study routes when another loader first reads the catalog offline. Private page snapshots remain account/session-bound and authorization and consent checks still apply.

Cached public assets return immediately. On-demand background checks are coalesced and throttled. Complete response bodies are compared before replacement, unchanged bytes are retained, and a response with an older Last-Modified date cannot replace a newer file. Missing files, connection failures, truncated bodies and failed cache writes retain the prior complete file. A changed response replaces it only through a successful atomic cache write. Explicit access denial, private/no-store responses, consent changes and revoked module access still enforce policy. API responses and authenticated documents remain network-only in the worker.

## Persistent Asset Cache

All built public page bundles, dynamic chunks, styles and emitted media are prepared by the worker without executing pages or fetching private data. Public responses fetched later are cached automatically. Worker activation carries complete public files into the new generation before retiring old storage; only current catalog-authorized module revisions can be carried over. A page visit is not required to download its public bundles. Private content still needs an authorized owner-prepared snapshot.

## Enrolled Offline Workspace

After verified sign-in, Study prepares schemas, readable locations, forms, viewed markers and opted-in lightweight collections for enrolled learning and teaching languages. Flashcards prepares every visible deck in enrolled learning or teaching languages, with two workers and no 80-deck cutoff. The dedicated cache is bounded to 64 MB and 10,001 reads so the gallery and ordinary deck collections fit together; larger collections remain subject to that limit. Non-enrolled languages are excluded. The shared schema catalog prepares even without enrollment, and missing optional Library collections do not prevent a prepared deck from entering practice. Enrollment changes trigger preparation again. Two workers limit concurrent reads; provider disposal, account changes, access denial and cached legal consent remain enforced. Pages need no prior visit; private snapshots remain scoped to the verified tab/session.

Offline Profile access requires the complete prepared own-profile snapshot: text, posts, connections, preferences and bounded avatar/banner images. Other users’ profiles are blocked even if previously cached. Administration, Modules, Users and Shares remain unavailable offline. Settings opens its local core controls; saved font, theme, language, timezone and display preferences apply locally and queue for server delivery. Email verification, account actions and contributed settings requiring a server remain unavailable offline.

The native close/reload guard covers protected records newly created in the current page and session. A real reload starts with that guard clear while preserving queued records for replay; new meaningful edits arm it again. Viewed Study markers and analytics are background activity and do not arm it. Other tabs’ records, previously persisted records and merely rendering pages do not create a warning. Provider disposal keeps current-page edits protected until delivery or removal.

The host exposes `ui:languageCatalog.load` through ctx and prepares the shared language catalog after verified sign-in. Core locale catalogs are included in the public boot set. Settings and the navbar use that same lifecycle-scoped read; saving a language preference offline keeps the working page open and applies the preference to later client navigation.

## Offline Study Practice

Library management and its edit/search/request pages require a connection. The Study hub and submenu hide those links offline, including immediately after disconnection; Explore remains available for cached browsing and drawing. The Library provider declares only Explore as an offline session route.

Enrollment preparation caches the shared schema catalog as well as each enrolled language’s catalog. Drawing and Flashcards can use their normal schema reads without a prior online page visit. Flashcards prepares its Share translations alongside its Study translations and gallery template, and reads selected-language collections using the same schema-qualified requests as the enrollment warmer. Prepared decks can open gallery and practice views offline. Audio, dictionary fetching, content edits and access/consent checks keep their existing restrictions.

## Offline Personal Settings

Verified sign-in prepares the account’s email list and trusted-domain policy without opening Settings. Email additions, removals and primary-address changes are projected locally and queued through `notify:emailClient` and the protected `notify.emails` outbox owner. Server validation remains authoritative. Email verification, resend and account lifecycle actions require connectivity; no codes, watch tokens or passwords enter the queue. Queued additions remain unverified until online verification. Successful delivery refreshes the email snapshot; optional refresh failure cannot turn a persisted write into a failed action. These bounded private snapshots remain tab/session-scoped.

## Prepared Flashcards

Flashcards prepares every visible deck in enrolled learning or teaching languages, with two workers and no 80-deck cutoff. The dedicated cache is bounded to 64 MB and 10,001 reads so the gallery and ordinary deck collections fit together; larger collections remain subject to that limit. Non-enrolled languages are excluded. The shared schema catalog prepares even without enrollment, and missing optional Library collections do not prevent a prepared deck from entering practice.

## Offline Orbitron

Orbitron is bundled from Google Fonts as a 400–900 variable font under the SIL Open Font License in `src/ui/styles/fonts/OFL.txt`. Its stylesheet and font file enter the public worker preparation set before an offline transition. Cached public assets are used first online and offline; the existing coalesced background revalidation keeps mutable assets current. Orbitron does not depend on a Google request at runtime. Other optional Google fonts load separately and cannot delay the local font.

## Configurable Top Banners

The `ui:broadcast.publish` descriptor accepts a CSS `background` color or gradient and a boolean `collapsible` flag, which defaults to false. Invalid descriptor types and declaration-breaking background values are rejected. A collapsible banner shrinks to a 2px patterned strip while scrolling down, expands while scrolling up and remains keyboard-focusable; hover or keyboard focus reveals its content and actions. The stack reserves its expanded document space to prevent scroll-anchor jumps, and its visible height offsets the sticky header and sidebar. Non-collapsible banners remain fully visible. Removing the last banner releases observers, scroll listeners and layout offsets. Offline Mode uses an orange-and-white warning pattern and opts into collapse; recovery keeps the guarded Refresh action.

## Smooth Recovery and Navigation

The offline notice uses a narrow orange-and-white stripe above an opaque themed surface. Collapsible banners animate their clipped wrapper height and content opacity while retaining their natural document space; keyboard expansion remains available, and reduced-motion preferences disable the transitions. Public assets, including the boot-prepared web manifest, can use the cache before private consent is accepted; private documents and API data retain their existing authorization gates. Explicitly disabling Offline Mode still uses the network. Individual resource failures require a failed health probe before announcing Offline Mode, and the worker stops probing after confirmation until recovery refreshes its catalog. Study navigation uses verified session snapshots immediately, with coalesced validation at most once per thirty seconds. Cold metadata requests are bounded to five seconds; optional dictionary discovery stops after three seconds. Authoritative read denials invalidate snapshots, enrollment/module changes invalidate navigation data, and failed sub-page discovery can retry.

## Atomic Marketplace Refresh

Marketplace refreshes prepare detached module records and finish loading their own locale bundles before replacing the visible catalog. Updating one module can redraw safely while another module’s translations are pending; tags resolve from their owning module rather than the host bundle. A missing translation still fails explicitly and leaves the last complete catalog visible. Lifecycle actions invalidate older refreshes, and periodic polling pauses while lifecycle or dependency checks are pending. Catalog metadata retains its matching locale bundle when installed metadata differs.

## Consistent Offline Feedback

Offline saves keep the same success messages and variants as connected saves. Messages, posts, image uploads and email changes do not add queue-specific notices, and message receipts use their normal presentation. Real persistence failures and rejected changes remain visible. The shared warning banner uses semantic light/dark palettes for its opaque amber surface, text, border, controls and restrained striped accent; Offline Mode no longer injects its own background styling. Collapse animation, keyboard expansion and reduced-motion support remain available.

## Live UI Language Changes

The language shortcut cycles only through enabled UI languages and applies the last choice after two seconds through the staged `ui:languageCatalog:select` and `ui:redraw` flows. The browser document, URL, history and private offline caches remain intact. Unsaved edits retain their navigation guard; stale work and failed mounts cannot commit a different locale. Selection is tab-local and scoped to the active account/session, without changing configured language membership or order. Settings keeps Save/Discard: saved priority changes use the same two-second redraw. Offline, Available is locked and cross-table moves and browser synchronization are blocked; Selected can still be reordered and saved through the normal preference buffer. Core/public component strings are prepared for enabled locales, English remains the per-key fallback, and genuinely missing keys still fail. The worker boot set includes all host component locale XML and language flag SVGs so unvisited prepared pages can redraw offline. Reused shell and contributed core navigation labels retranslate without tearing down providers. Language-switch timers are disposed with their page or replacement binding.

After Save completes, the scheduled redraw still checks for newer unsaved edits. Edits made during the two-second delay retain their discard confirmation; repeated saves coalesce, and leaving Settings cancels pending redraws.

## Fewer Online Requests

Public asset reads share an in-flight download until its cache write finishes, so concurrent pages and providers do not download the same resource repeatedly. A worker update reuses complete content-hashed host assets from earlier cache generations; mutable assets still refresh from the server. Existing cache-first responses, conditional background revalidation, module revision checks and Offline Mode opt-out behavior remain in effect. The language catalog and Study navigation metadata use a thirty-second online freshness window, including when Offline Mode is disabled. Online freshness expires on demand rather than polling; concurrent refreshes coalesce. Study retains its existing consent-gated background revalidation. Account/session changes, expiry, component lifecycle changes and explicit invalidation clear the relevant snapshots. Other private reads and writes keep their existing transport and authorization checks.

## Session and Component Boundaries

Only an identical consecutive mutation from the same delivery owner is suppressed; changes to methods, paths, media types or intervening operations retain their order. Offline enqueueing and replay require Auth’s `session:isOfflineValid` capability as well as current consent. The capability checks verified setup readiness, account, token and session expiry without network requests, including when storage locks delay persistence. An unavailable Auth contract fails closed. Settings binds account controls before optional email loading; disabling Notify hides email management and leaves Archive, Deactivate and Delete usable. Users and Administration consume Notify through scoped capabilities instead of concrete UI imports. Notify supplies administrator email reads, online-only resend and SMTP availability; absent email metadata is shown as unknown. Auth skips normal account setup for alternate guest sessions and uses Share’s classification capability to exempt share guests at the server boundary. Real account email/TFA setup remains enforced.

## Account-bound Queues

Queued records include the server-verified account-instance identifier. Auth returns its canonical `accountInstanceId` in authenticated setup status and exposes `session:getOfflineIdentity` only for a verified, setup-ready, unexpired account session. Missing authoritative metadata revokes offline authorization. Queue views and storage/delivery checks bind to this instance; retired or unbound records are rejected before transport, including after recreating a local account with the same account ID. Operation IDs cannot collide across account instances. Bearer tokens are never persisted in the queue.

## Acknowledged Favourites

Successful online favourite changes and replay acknowledgements replace Study’s bounded offline snapshot with the server response. A superseded in-flight read cannot overwrite that snapshot. Offline page remounts preserve acknowledged additions and removals while remaining queued intent stays projected over the snapshot.

## Independent Emoji Usage

The reusable Messages reaction picker records emoji frequency independently of reaction changes. Only the message-reaction request includes the final active state. Usage-recording failures are logged without preventing the selected reaction or its update callback.

## Account-aware User Menus

Users action menus resolve rows by immutable account ID rather than public username. SSO accounts retain their TFA reset entry and founder state, and externally managed password resets remain disabled. A stale or unknown selection cannot open account actions.

## Complete Cached Assets

Range requests bypass the whole-file cache, and only complete HTTP 200 responses can populate or replace public assets. Partial responses leave existing complete bytes intact. Content-hashed font files use the same immutable caching and cross-generation reuse as hashed scripts and images, avoiding unnecessary downloads after worker updates.
