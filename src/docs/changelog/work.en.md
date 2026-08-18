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

Installed modules are imported into the runtime immediately and remain disabled until an administrator activates them. Marketplace images load through public, unguessable same-origin asset URLs.

## Refine marketplace details

Licenses are displayed separately from tags, details use the full results width, and compact SVG controls replace text-heavy back and refresh actions.

## Separate installation from activation

Installing a module now leaves it disabled until an administrator explicitly enables it. Enabling or disabling a module refreshes browser navbar plugins immediately so newly registered navigation contributions appear without a page reload.

## Theme marketplace controls

Back and refresh controls now use dedicated light and dark SVG assets selected by the active dashboard theme.

## Keep discovered modules available

Marketplace manifests are cached per configured source. Uninstalling a module returns it to Available immediately, temporary source failures retain the cached entry, and a module disappears only after every configured source successfully confirms it is absent.

## Keep core out of modules

Cognis Core is no longer returned by the module administration list because the platform core is not an installable module.

## Verify declared licenses

License metadata is displayed only when a recognized license file exists at the repository root. Installation validation rejects declared license metadata without that repository evidence.

## Allow module installation time

Marketplace installs now use a two-minute request window so cloning and validating larger repositories such as Jitsi Meet does not fail at the generic thirty-second API timeout.

## Show all modules first

The module status filter now includes All and selects it by default, presenting installed, available, and recommended modules together when the page opens.

## Install releases with responsive feedback

Module discovery now includes repository tags alongside branches, while the detail selector still defaults to the repository's default branch. Lifecycle buttons show an in-button progress spinner, and module installation uses a bounded two-minute request window suitable for repositories within the supported size.

## Consolidate marketplace settings

Module Sources now lives solely as a dedicated section of the marketplace settings popup. Detail metadata separates provider and version from category tags, and the settings control now has light- and dark-theme artwork.

## Test modules before activation

Enabling a module now executes every standard JavaScript and TypeScript test supplied by its checkout before changing runtime state. Any failing or timed-out test rejects activation and reports the module test failure.

## Include external modules in the core test command

The root `npm test` runner now discovers tests under both the Cognis source tree and the configured external-module checkout root, including checkouts stored outside the repository through `COGNIS_EXTERNAL_MODULES_ROOT`.

## Restore the marketplace catalog immediately

The Modules page now hydrates from the persisted per-source catalog before background discovery begins, so known modules remain visible across navigation and server restarts. Repository refreshes update successful candidates independently and retain cached entries whenever an individual probe is inconclusive.

## Restore Jitsi Meet installation

Installation now accepts catalogs written before release-tag metadata was introduced. This removes the missing `releases` crash that regressed Jitsi Meet installation, while independent repository probing prevents unrelated organization repositories from hiding Jitsi Meet.

## Keep installation errors local

Expected module installation failures no longer trigger the global connection-interrupted recovery state or permanent toast; the marketplace action continues to report its own failure.
