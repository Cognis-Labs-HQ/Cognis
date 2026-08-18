# Module Marketplace

## A dedicated app store

Modules now have a separate Administration page with installed, available, recommended, and category views plus configurable GitHub and GitLab sources.

## External repository support

Administrators can discover public or private repositories with optional keyring-protected PATs, and Cognis validates manifests and immutable UUIDs during installation.

## UUID dependencies

All component manifests now retain readable names and IDs while using stable UUIDs for dependency declarations.

## Reliable marketplace controls

Module cards, filters, source settings, and lifecycle controls now update the marketplace content immediately without resetting the surrounding page layout. Module details retain the store navigation, and consistently sized cards keep descriptions and lifecycle actions aligned.

External checkouts now pass a repository-readiness gate covering root package and route contracts, declared entry points and artwork, safe paths, and optional file checksums before an install can replace the active checkout.

Installed repositories are now discovered as complete runtime components. Their bootstrap entrypoint can contribute routes, UI, documentation, changelogs, capabilities, and flow stages through a tracked `ctx` scope; disabling or uninstalling invokes teardown and removes every tracked contribution.

Jitsi Meet has been removed from the bundled source tree and is now expected to arrive through the marketplace. Cognis Labs HQ on GitHub is always present as an immutable trusted module source.

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

## Publish module lifecycle changes immediately

Completed install, enable, disable, update, and uninstall operations now update the marketplace immediately, publish a structured lifecycle event, refresh navbar registrations, and reconcile against authoritative server state without requiring a page reload. The detail-view version selector also follows the active theme.

## Keep module actions synchronized

Module lifecycle progress is now stored by module UUID rather than only on the clicked DOM node, preserving disabled controls and the spinner while moving between cards and details. Successful operations immediately switch to the next valid controls. The release selector no longer applies the conflicting light-mode class, and failed installs now return and display the precise server error while recording structured server and browser logs.

## Make marketplace installation resilient and release-aware

Module installs now run as polled background jobs so reverse proxies cannot turn a healthy clone into a 504. Cognis refreshes configured sources at server startup, compares manifest versions rather than code-only commit changes, supports switching release channels, confirms downgrades, and offers a force-update advanced action.

## Add marketplace media galleries and theme-safe controls

A module repository may provide a root `media/` directory of supported images and videos. The detail view renders those assets in a horizontal gallery, and its native release-channel selector now supplies explicit theme colors without conflicting select classes.

## Retry interrupted module downloads

Module installation now forces Git's more broadly compatible HTTP/1.1 transport and retries transient clone failures such as connection resets, timeouts, DNS failures, and interrupted TLS transfers. Every attempt starts with a clean staging directory, while permanent repository or validation failures still stop immediately and retain their exact diagnostic.

## Diagnose GitHub timeouts

Module downloads now stop a stalled GitHub clone attempt after thirty seconds, retry transient failures, and record the known container-network MTU cause in structured server logs. Administrators receive a focused toast that recommends checking the host or Docker network MTU instead of Cognis overriding deployment networking.

## Complete external module loading

The external-module bootstrap context now ingests every supported HTTP method, navbar and SPA route registrations, settings, administration, page, authentication-typing, static-resource, flow, logging, and scoped capability contributions. External meeting providers can therefore register navigation and routes through the same removable contracts as bundled components.

## Align module detail controls

The advanced hamburger menu now shares the top navigation row with the Back control in module details, leaving install and lifecycle actions in their own action row.

## Persist installed modules and artwork

Docker deployments now store external modules in a dedicated named volume mounted at the configured external-module root, so rebuilding the application container preserves installed modules. Marketplace reconciliation also retains catalog-proxied icon and banner URLs when installed manifest state is merged, preventing artwork from disappearing until a page refresh.

## Preserve activation during force updates

Force Update now temporarily disables an active module before replacing its checkout and re-enables it afterward. If the download or validation fails, Cognis still re-enables the existing checkout so a failed forced update does not leave the module unexpectedly disabled.
