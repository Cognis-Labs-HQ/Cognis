# Share Gateway

## Overview

The Share gateway owns public share tokens for Cognis resources. It mints, lists, revokes, and resolves share links through canonical `ctx` flows so resource-owning gateways and modules can participate without importing share internals.

## Share Page

Shared resources open on `/share/:token`. The page uses the standard page composer with a minimal shell, a Cognis-branded header, and a renderer chosen by the resource-owning component.

While the resolved shared-content route remains active, both signed-in direct-access participants and guests may receive synchronized component windows without a new browser activation. Requests still pass the component-page broker's host-element and lifecycle validation.

After share authentication succeeds, the page invalidates any anonymous SPA-route discovery result before mounting the resource renderer. Component-window resolution therefore reloads the enabled component-page catalog with the active guest or account credentials instead of retaining an empty pre-authentication cache.

Guest component windows also receive the active Share context as a provider mount option. Embedded components can therefore preserve the guest session and use its delegated resource scope instead of treating the mount as an ordinary account-only page.

## Guest Sessions

When a share token is resolved, the Share gateway now issues a short-lived guest access token (`purpose: share`) bound to that share record (`sub: share:<shareId>`). The share page temporarily swaps this token into `localStorage` so API calls made by mounted shared pages run as an anonymous guest session, then restores the previous token on unload. After the scoped guest token is active, the Share page loads host UI capability providers before importing the resource renderer, so shared components can consume declared capabilities such as profile-avatar rendering.

Anonymous guests never unlock an account keyring. Share activates the delivered guest keyring with its server-issued session material, keeps it unlocked without a user password for the guest session, and deletes its session-only encrypted vault when that session ends. Account keyring lookup and persistence remain available only when the visitor entered with a validated non-guest account session, including after a guest page refresh.

## Shareable Manifest Contract

Shareable components declare a `share` block in their manifest with `shareable`, `mountScriptUrl`, `stringsBaseUrl`, and `guestApiScopes`. The share page prioritizes `mountScriptUrl` so shared resources can mount real page components instead of static cards.

## Security Boundary

Guest tokens are scoped to one share record, expire quickly (capped at four hours and never longer than the share token), and only unlock routes that explicitly validate share scope and capabilities. Mutating routes keep their existing user/session checks and reject share guests.

## Share Controls

Share records now carry gateway-owned access controls: read/write permissions, typed recipients for in-app users, groups/classes, and email recipients, optional password protection, and a readonly watermark flag. The Share gateway exposes generic token create/update routes so modules request a share through `ctx` or `/api/v1/share/tokens` and do not own recipient delivery or permission editing. Readonly shares default to watermarking, while write-enabled shares clear that default unless a caller explicitly keeps it. The gateway-owned button renderer always pairs the canonical share icon with the localized Share label.

## Share Method Adapters

The popup discovers sharing methods from Share gateway adapters and displays them as a method row. Link and User each own their input preparation and popup-page behavior, while history is filtered to the selected method.

## Expiry and Protection

Both built-in methods accept an optional exact expiry date and time; leaving it unset creates a non-expiring share. Password hashing and verification remain owned by the Share gateway. Resource components may provide Link access modes with method-specific permissions and granted capabilities.

## Recipient delivery feedback and password aliases

A share facilitator may return generic delivery feedback containing a translation key and component string base URL. The authenticated notification action displays that feedback before navigating to the delivered resource. After a protected token resolves, Share saves the verified password under both the opaque link token and the canonical share identifier so the receiving component can reuse it without prompting again.

## Resolution and revocation UX

The browser probes token resolution without opening the account keyring. Only a `401 password_required` challenge permits account-keyring restoration and a saved-password retry; `404` responses display the localized no-longer-existing share state. Every share revocation requires a confirmation popup before the delete request is sent.

## Component-window boundary

A mounted link-share page may programmatically spawn an otherwise valid component page, which is required for synchronized meeting peripherals. This authorization covers only the browser window operation: the owning module must still expose guest-safe state routes and resolve the share guest against its parent resource, while a child component must explicitly accept delegated access to its resource. Share does not reinterpret a meeting share as a whiteboard share or bypass either component's API authorization.
