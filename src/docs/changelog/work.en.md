# Align Module Configuration Ownership

## Use module-owned configuration endpoints

Cognis now renders fields declared by module manifests while loading and saving values through each module’s own `GET` and `PUT` configuration endpoint. Modules remain responsible for validating, applying, and persisting their operational settings; Cognis no longer maintains a parallel preference-backed configuration.
