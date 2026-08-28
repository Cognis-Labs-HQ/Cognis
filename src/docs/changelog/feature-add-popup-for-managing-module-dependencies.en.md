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
