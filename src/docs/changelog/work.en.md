# Reliable Module Discovery

## Skip invalid repositories

The Module Marketplace now ignores repositories that do not provide a complete, valid module manifest. One unrelated repository or an unavailable source can no longer prevent the Modules page from loading.

## Fall back from missing icons

Module cards now replace unavailable remote artwork with a theme-aware question-mark icon without opening the runtime error popup.

## Refresh module sources

The Modules page now provides a Refresh control beside Module Sources to re-query every configured provider and rebuild the visible catalog.

## Manage and discover sources progressively

Module Sources now opens as a dedicated list-and-editor manager. The trusted default organization remains visible and read-only, while custom sources can be added, edited, or removed. The Modules page renders immediately with known modules and adds discoveries independently as each configured source responds.
