# Reliable Status and Refresh

## Profile status light restored

The dashboard shell now initializes signed-in account enhancements when the guest-session capability reports a normal authenticated session, restoring the availability light over the navigation avatar.

## Release-channel refreshes bypass caches

Marketplace repository pagination now bypasses intermediary HTTP caches so a manual refresh retrieves newly created module branches and tags immediately.

## Share capabilities and controls unified

Share guest renderers now receive standalone profile capabilities and fully loaded avatar styles before mounting. Gateway-owned share controls consistently display the localized Share label beside the canonical share icon.

## Module styles contained

Declared module route styles now load in a lower cascade layer. Modules retain control of their page content while Cognis keeps authoritative styling over the shell, navigation, and profile avatar.
