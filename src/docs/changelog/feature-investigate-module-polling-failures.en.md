# Reliable Module Strings

## Stop polling unavailable strings

The module catalog now advertises localization resources only after confirming that the required English string asset is present in the server cache. Periodic marketplace polling therefore no longer repeats requests to string URLs that can only return 404.

The marketplace UI now also preserves that suppression instead of reconstructing a conventional static URL for catalog entries whose localization asset is unavailable.

## Diagnose incomplete module caches

The API records a structured warning with the module, locale, and asset identifier when a module declares localization but its cached English resource is unavailable. A refreshed source scan can repopulate the cache, while module authors must continue to ship `ui/languages/en/strings.xml` and the other supported translations.

## Configure modules before validation

Routes that a module explicitly marks as available while disabled are now registered in a restricted configuration bootstrap. Other routes, UI contributions, capabilities, and flow hooks remain inactive. Administrators can therefore configure modules such as Jitsi Meet before enablement validation checks that configuration.
