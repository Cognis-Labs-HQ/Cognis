# External module dependencies

## Dependency-aware installation

External modules can declare discouraged hard dependencies and optional soft dependencies. Installation now presents all dependencies, blocks unmet hard requirements, lets administrators select any optional companions, and enables selected dependencies.

## Reliable activation and release channels

Cancelling a module integrity warning now stops dependency activation and required configuration flows. Selected release channels are stored by the server and survive restarts even before installation.

## Safe symlink integrity verification

Module SHASUM validation now follows file symlinks that resolve inside the module, including an `AGENTS.md` alias to `.github/copilot-instructions.md`, while rejecting broken links, directories, and targets outside the module.
