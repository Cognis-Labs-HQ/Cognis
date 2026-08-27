# Reliable Module Strings

## Stop polling unavailable strings

The module catalog now advertises localization resources only after confirming that the required English string asset is present in the server cache. Periodic marketplace polling therefore no longer repeats requests to string URLs that can only return 404.

The marketplace UI now also preserves that suppression instead of reconstructing a conventional static URL for catalog entries whose localization asset is unavailable.

## Refresh module sources at startup

Cognis now performs one forced module-source scan when the API starts. This refreshes cached localization assets before marketplace polling begins, so modules with valid string files resolve their translated names and summaries after a restart.

## Keep module refreshes stable

Periodic marketplace checks now keep the currently rendered module cards visible until both cached and source data are ready, avoiding intermediate text flashes. Enabled module assets also remain directly resolvable while their UI contributions refresh, preventing transient navbar dependency errors after activation.

## Load every module translation

Public GitHub module strings now use the repository's raw-content endpoint, matching how Nextcloud Whiteboard hands its locale files to Cognis while avoiding API request limits during parallel discovery. Jitsi Meet, Nextcloud Whiteboard, and Study language metadata therefore resolve consistently instead of depending on which locale requests completed before the limit was reached.

## Diagnose incomplete module caches

The API records a structured warning with the module, locale, and asset identifier when a module declares localization but its cached English resource is unavailable. A refreshed source scan can repopulate the cache, while module authors must continue to ship `ui/languages/en/strings.xml` and the other supported translations.

## Configure modules before validation

Routes that a module explicitly marks as available while disabled are now registered in a restricted configuration bootstrap. Other routes, UI contributions, capabilities, and flow hooks remain inactive. Administrators can therefore configure modules such as Jitsi Meet before enablement validation checks that configuration.

## Disabled modules remain unloaded

Disabled external modules are no longer imported or bootstrapped during route refreshes, preventing their top-level and lifecycle code from running.

## Private source scans wait for credentials

Startup discovery now scans only public module sources. Credentialed private sources remain available for authenticated marketplace polling without a credentialless attempt delaying their next refresh.
