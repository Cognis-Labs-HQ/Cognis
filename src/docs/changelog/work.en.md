# Reliable Module Discovery

## Skip invalid repositories

The Module Marketplace now ignores repositories that do not provide a complete, valid module manifest. One unrelated repository or an unavailable source can no longer prevent the Modules page from loading.

## Fall back from missing icons

Module cards now replace unavailable remote artwork with a theme-aware question-mark icon without opening the runtime error popup.

## Refresh module sources

The Modules page now provides a Refresh control beside Module Sources to re-query every configured provider and rebuild the visible catalog.

## Manage and discover sources progressively

Module Sources now opens as a dedicated list-and-editor manager. The trusted default organization remains visible and read-only, while custom sources can be added, edited, or removed. The Modules page renders immediately with known modules and adds discoveries independently as each configured source responds.

## Select branches and detect updates

Marketplace details now list every repository branch and select the repository default automatically. Installs record the chosen branch and commit, allowing module cards and details to offer an Update action whenever that branch advances.

## Serve marketplace artwork safely

Marketplace artwork is now fetched by the server and exposed through unguessable same-origin URLs. Missing artwork uses the bundled question-mark icon without weakening the Content Security Policy.

## Curate recommended modules

Recommended status now comes from an administrator-configurable published UUID list rather than module manifests. Marketplace settings now contain both recommendation and source configuration.

## Complete module installation

Installed modules are activated immediately so their navigation and runtime contributions appear without an extra manual step. Marketplace images load through public, unguessable same-origin asset URLs.

## Refine marketplace details

Licenses are displayed separately from tags, details use the full results width, and compact SVG controls replace text-heavy back and refresh actions.
