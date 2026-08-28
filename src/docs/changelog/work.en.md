# Reliable module updates

## Restore module states after updates

Temporary disables for updates, forced updates, and release-channel changes now preserve the enabled state of the updated module and all enabled hard dependents. Dependents return online after an in-process update, while a required server restart restores the same states during startup.

## Complete dependency manifest types

The canonical module manifest contract now declares hard and soft external dependencies so TypeScript module authors and core consumers can use dependency metadata without unsafe casts.
