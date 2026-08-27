# Reliable Module Strings

## Stop polling unavailable strings

The module catalog now advertises localization resources only after confirming that the required English string asset is present in the server cache. Periodic marketplace polling therefore no longer repeats requests to string URLs that can only return 404.

## Diagnose incomplete module caches

The API records a structured warning with the module, locale, and asset identifier when a module declares localization but its cached English resource is unavailable. A refreshed source scan can repopulate the cache, while module authors must continue to ship `ui/languages/en/strings.xml` and the other supported translations.
