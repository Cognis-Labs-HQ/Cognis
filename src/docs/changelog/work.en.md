# Restore installed module pages

## Load external module UI routes from their installation directory

Installed modules are now resolved by their stable UUID in the external module directory. Their declared pages and navigation contributions load automatically on startup instead of being looked up under the bundled module path.

## Finish module bootstrap before serving requests

Cognis now waits for persisted module state restoration and module bootstrap to finish before accepting a request. External module scripts and styles are therefore registered before their pages request them.
