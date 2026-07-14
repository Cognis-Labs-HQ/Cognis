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
