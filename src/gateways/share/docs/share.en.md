# Share Gateway

## Overview

The Share gateway owns public share tokens for Cognis resources. It mints, lists, revokes, and resolves share links through canonical `ctx` flows so resource-owning gateways and modules can participate without importing share internals.

## Share Page

Shared resources open on `/share/:token`. The page uses the standard page composer with a minimal shell, a Cognis-branded header, and a renderer chosen by the resource-owning component.

## Guest Sessions

When a share token is resolved, the Share gateway now issues a short-lived guest access token (`purpose: share`) bound to that share record (`sub: share:<shareId>`). The share page temporarily swaps this token into `localStorage` so API calls made by mounted shared pages run as an anonymous guest session, then restores the previous token on unload.

## Shareable Manifest Contract

Shareable components declare a `share` block in their manifest with `shareable`, `mountScriptUrl`, `stringsBaseUrl`, and `guestApiScopes`. The share page prioritizes `mountScriptUrl` so shared resources can mount real page components instead of static cards.

## Security Boundary

Guest tokens are scoped to one share record, expire quickly (capped at four hours and never longer than the share token), and only unlock routes that explicitly validate share scope and capabilities. Mutating routes keep their existing user/session checks and reject share guests.

## Share Controls

Share records now carry gateway-owned access controls: read/write permissions, typed recipients for in-app users, groups/classes, and email recipients, optional password protection, and a readonly watermark flag. The Share gateway exposes generic token create/update routes so modules request a share through `ctx` or `/api/v1/share/tokens` and do not own recipient delivery or permission editing. Readonly shares default to watermarking, while write-enabled shares clear that default unless a caller explicitly keeps it.

## Share Method Adapters

The popup discovers sharing methods from Share gateway adapters and displays them as a method row. Link and User each own their input preparation and popup-page behavior, while history is filtered to the selected method.
