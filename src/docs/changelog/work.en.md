# Restore installed module pages

## Load external module UI routes from their installation directory

Installed modules are now resolved by their stable UUID in the external module directory. Their declared pages and navigation contributions load automatically on startup instead of being looked up under the bundled module path.

## Finish module bootstrap before serving requests

Cognis now waits for persisted module state restoration and module bootstrap to finish before accepting a request. External module scripts and styles are therefore registered before their pages request them.

## Provide authentication capabilities to modules

The authentication gateway now publishes its request authentication and role-access functions through the capability bus. External modules can bootstrap their protected API routes without importing gateway internals, allowing their UI assets and navigation registrations to remain active.
