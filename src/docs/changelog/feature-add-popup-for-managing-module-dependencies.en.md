# External module dependencies

## Dependency-aware installation

External modules can declare discouraged hard dependencies and optional soft dependencies. Installation now presents all dependencies, blocks unmet hard requirements, lets administrators select any optional companions, and enables selected dependencies.

## Reliable activation and release channels

Cancelling a module integrity warning now stops dependency activation and required configuration flows. Selected release channels are stored by the server and survive restarts even before installation.

## Safe symlink integrity verification

Module SHASUM validation now follows file symlinks that resolve inside the module, including an `AGENTS.md` alias to `.github/copilot-instructions.md`, while rejecting broken links, directories, and targets outside the module.

## Verified aliases and cancellation feedback

Undeclared symlink aliases no longer trigger a SHASUM warning when they resolve to an already declared and verified module file. Cancelling installation now displays a clear cancellation notification.

## Dependency cards for install and enable

Dependency confirmation now presents complete module cards with required, optional, and recommended labels plus direct detail links. The check runs before both installation and enablement and is skipped when every dependency is already enabled.

## Consistent dependency controls

Dependency cards now reuse the application’s established status-pill palette. Detail navigation uses the existing themed SVG chevron asset instead of a text arrow.

## Immediate dependency activation

Each unmet dependency card now provides an immediate SVG download action with loading feedback that installs and enables that dependency. The primary action reflects Install or Enable, remains disabled for missing required dependencies, uses the neutral app action while optional dependencies remain, and becomes confirm-styled once every dependency is enabled.

## Dependency readiness before progress

Install and Enable now perform the same full dependency-readiness gate before the lifecycle action enters its loading state. Cancelling the dependency popup exits immediately without leaving the module action spinner running.

## Cascading hard-dependency shutdown

Disabling a module now recursively disables every enabled module that declares it as a hard dependency, while soft dependents remain active. Dependency cards now use a dedicated download SVG with a tray instead of a generic down arrow.

## Theme-aware dependency actions

Dependency download and play controls now use dedicated light/dark SVG assets. Installed but disabled dependencies show Play instead of Download, and status-pill text follows the active theme while retaining established state backgrounds.

## Correct icon contrast in both themes

Dependency download and play controls now use dark icon artwork on light surfaces and light icon artwork in dark mode, ensuring both actions remain visible in either theme.

## Configure dependencies before activation

Dependencies that require initial settings now open their configuration dialog above the dependency manager before activation is attempted. Saving valid settings lets activation continue without falling through to a server-side configuration error.

## Restore module states after updates

Temporary disables for updates, forced updates, and release-channel changes now preserve the enabled state of the updated module and all enabled hard dependents. Dependents return online after an in-process update, while a required server restart restores the same states during startup.

## Complete dependency manifest types

The canonical module manifest contract now declares hard and soft external dependencies so TypeScript module authors and core consumers can use dependency metadata without unsafe casts.

## Validated dependency restoration

Startup and post-update restoration now leave modules disabled when their hard dependencies or enablement checks fail. External manifest dependency fields reject malformed values before they reach the Administration interface.

## Commits

**Feature Branch:** feature-add-popup-for-managing-module-dependencies

- [Validate module dependency restoration](https://github.com/Cognis-Labs-HQ/Cognis/commit/755fd2af)
- [Split oversized source modules](https://github.com/Cognis-Labs-HQ/Cognis/commit/c8e75c62)

## Focused source modules

The keyring UI, core UI routes, and module-route tests are now split into focused sibling files so every source file complies with the 1,000-line architecture limit.
