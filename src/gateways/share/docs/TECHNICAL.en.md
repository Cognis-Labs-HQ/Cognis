# Technical Reference

The public interfaces and operational rules of Sharing.

## Interfaces

### Shareable Manifest Contract

Shareable components declare a `share` block in their manifest with `shareable`, `mountScriptUrl`, `stringsBaseUrl`, and `guestApiScopes`. The share page prioritizes `mountScriptUrl` so shared resources can mount real page components instead of static cards.

### Delegated access contract

`share:resolveDelegatedAccess` accepts guest claims plus a target `resourceType`, `resourceId`, and `requiredCapability`. Share resolves the token's original resource and runs `resolve-share-delegated-access` with `{ source, target }`. A source-resource hook may authorize only by returning the exact source and target identifiers, a non-empty `sourceCapability`, and `allowedCapabilities`. Share independently verifies that the original token grants `sourceCapability`; mismatched identifiers or capabilities fail closed. Target components never import or name the source provider.

## Configuration

Shareable manifests declare renderer and guest API scopes. Each share records permissions, recipients, expiry and optional protection; method adapters own their input pages.

## Behavior

### Share browser client

Adapter navbar providers are declared by the owning adapter and follow its enabled state. Sender discovery uses `notify:listSenders`, without receiving the Notification Gateway implementation. Periodic Share maintenance stops on gateway disable and resumes on activation.

The Share browser client lets modules retrieve the current authenticated share-guest profile through the Share gateway's public browser contract.

### Share Delivery

See the [shared contract](/docs/adapters/study/flashcards/technical) for this behavior.

Guest Flashcard practice uses a temporary mode selection and disables account enhancements and persisted layout settings. It does not read or write account practice preferences.

### Lifecycle Boundaries

Share adapters may export `defineContracts(ctx)`. Share invokes this before constructing the method, using the shared contract registry and adapter-owned bootstrap scope. Invalid methods roll back their definitions and log safe failure metadata. Definitions follow gateway disable and reactivation.

See the [shared contract](/docs/adapters/study/flashcards/technical) for this behavior.

### Owned Browser Actions

Shared resources supply `page.mountScriptUrl` with an exported `mount(root, options)`. The mount receives the share context, localized strings and page cancellation signal. Missing entrypoints produce the localized renderer error.

### Overview

The Share gateway owns public share tokens for Cognis resources. It mints, lists, revokes, and resolves share links through canonical `ctx` flows so resource-owning gateways and modules can participate without importing share internals.

### Share Page

Shared resources open on `/share/:token`. The page uses the standard page composer with a minimal shell, a Cognis-branded header, and a renderer chosen by the resource-owning component.

While the resolved shared-content route remains active, both signed-in direct-access participants and guests may receive synchronized component windows without a new browser activation. Requests still pass the component-page broker's host-element and lifecycle validation.

After share authentication succeeds, the page invalidates any anonymous SPA-route discovery result before mounting the resource renderer. Component-window resolution therefore reloads the enabled component-page catalog with the active guest or account credentials instead of retaining an empty pre-authentication cache.

Guest component windows also receive the active Share context as a provider mount option. Embedded components can therefore preserve the guest session and use its delegated resource scope instead of treating the mount as an ordinary account-only page.

### Guest Sessions

When a share token is resolved, the Share gateway now issues a short-lived guest access token (`purpose: share`) bound to that share record (`sub: share:<shareId>`). The share page temporarily swaps this token into `localStorage` so API calls made by mounted shared pages run as an anonymous guest session, then restores the previous token on unload. After the scoped guest token is active, the Share page loads host UI capability providers before importing the resource renderer, so shared components can consume declared capabilities such as profile-avatar rendering.

Anonymous guests never unlock an account keyring. Share activates the delivered guest keyring with its server-issued session material, keeps it unlocked without a user password for the guest session, and deletes its session-only encrypted vault when that session ends. Account keyring lookup and persistence remain available only when the visitor entered with a validated non-guest account session, including after a guest page refresh.

### Share Controls

Share records now carry gateway-owned access controls: read/write permissions, typed recipients for in-app users, groups/classes, and email recipients, optional password protection, and a readonly watermark flag. The Share gateway exposes generic token create/update routes so modules request a share through `ctx` or `/api/v1/share/tokens` and do not own recipient delivery or permission editing. Readonly shares default to watermarking, while write-enabled shares clear that default unless a caller explicitly keeps it. The gateway-owned button renderer always pairs the canonical share icon with the localized Share label.

### Share Method Adapters

The popup discovers sharing methods from Share gateway adapters and displays them as a method row. Link and User each own their input preparation and popup-page behavior, while history is filtered to the selected method.

### Expiry and Protection

Both built-in methods accept an optional exact expiry date and time; leaving it unset creates a non-expiring share. Password hashing and verification remain owned by the Share gateway. Resource components may provide Link access modes with method-specific permissions and granted capabilities.

### Recipient delivery feedback and password aliases

A share facilitator may return generic delivery feedback containing a translation key and component string base URL. The authenticated notification action displays that feedback before navigating to the delivered resource. After a protected token resolves, Share saves the verified password under both the opaque link token and the canonical share identifier so the receiving component can reuse it without prompting again.

### Resolution and revocation UX

The browser probes token resolution without opening the account keyring. Only a `401 password_required` challenge permits account-keyring restoration and a saved-password retry; `404` responses display the localized no-longer-existing share state. Every share revocation requires a confirmation popup before the delete request is sent.

### Component-window boundary

A mounted link-share page may programmatically spawn an otherwise valid component page. This authorization covers only the browser window operation. For API access, the Share gateway resolves delegation generically through the `resolve-share-delegated-access` flow: the source-resource owner proves its relationship to the requested target and declares the allowed target capabilities, while Share verifies that the guest token grants the required source capability and keeps the result bound to both resource identifiers. Share never hardcodes resource pairings or treats one resource share as another.

Share page startup checks the page abort signal after asynchronous preparation. Closing a guest page prevents late rendering; disabling Share cancels its maintenance lifetime so a pending expiry scan cannot send later notices.

### Enforce expiry at access checks

Direct user shares stop granting access at expiry, including password-unlocked shares retained for history. An empty expiry remains unlimited; malformed nonempty expiry values deny access.

### Honor explicit grant revocation

PATCH with `grantedCapabilities: []` removes every granted capability. Omitting the field preserves grants; a nonempty array replaces them. Recipient, password and adapter checks remain in force.

### Typed Token Results

Share 1.9.9 declares the token fields returned by issue, update and list capabilities, including metadata, expiry, recipients and granted capabilities. Bootstrap callbacks and structured query fixtures use explicit contracts. Owner checks and explicit empty capability revocation remain enforced.

Synthetic tests exercise persisted token results, denied owner updates and guest profile cleanup. Recipient, password, adapter and expiry checks retain their existing behavior.

### Credential Scope

Account operations require verified account sessions. Shared-resource operations explicitly verify guest credentials and recheck the current grant before applying resource permissions. Account names never determine credential type. Revoked or expired access is denied.

## Security

### Security Boundary

Guest tokens are scoped to one share record, expire quickly (capped at four hours and never longer than the share token), and only unlock routes that explicitly validate share scope and capabilities. Mutating routes keep their existing user/session checks and reject share guests.

## Reference

### Technical specification

The client owns `/api/v1/share/guest-profile`, returns the original `Response`, and relies on the host API client for authentication and connection handling. Its provider is active only with the Share gateway, so dependent routes must declare `share:uiClient` when they require it during mount.

Browser components that render a Share action require `share:uiGateway` and call `mountTrigger(container, options)`. The gateway owns the localized icon-and-label markup, consequence styling, guest-session suppression, and teardown handle; consumers supply only their container and activation callback.

### Technical Specification

| Page / surface | Guide         | Access         |
| -------------- | ------------- | -------------- |
| `/shares`      | Sharing Guide | Signed-in user |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.

An empty share list retains overview and filtering guidance while recipient and management stages are excluded from the total.
