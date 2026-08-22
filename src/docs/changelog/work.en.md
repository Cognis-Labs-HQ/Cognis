# Reliable Status and Refresh

## Profile status light restored

The dashboard shell now initializes signed-in account enhancements when the guest-session capability reports a normal authenticated session, restoring the availability light over the navigation avatar.

## Release-channel refreshes bypass caches

Marketplace repository pagination now bypasses intermediary HTTP caches so a manual refresh retrieves newly created module branches and tags immediately.

## Share capabilities and controls unified

Share guest renderers now receive standalone profile capabilities and fully loaded avatar styles before mounting. Gateway-owned share controls consistently display the localized Share label beside the canonical share icon.

## UI ownership clarified

SPA route cleanup now preserves shell-owned stylesheets. The module contract clearly separates host-owned reusable UI and navigation from module-namespaced content styling.

## Installation failures protected

Module installation polling now returns stable public error codes without exposing internal filesystem, repository, or validation details.

## Module prerequisites restored

The conventional root README alias no longer participates in module integrity checks, disabled module configuration probes no longer surface expected missing-route errors, and the Share gateway now publishes its canonical browser trigger capability for dependent modules.

## Shared-page providers refreshed

Share pages now refresh host capability providers after activating their scoped guest session, and Cognis publishes a validated runtime resource loader required by module pages.
