# Nextcloud Whiteboard settings availability

## Settings now report unavailable dependencies

Nextcloud Whiteboard now registers its administration configuration endpoints even when required runtime dependencies are missing, so the settings popup receives a clear service-unavailable response instead of a missing-route 404.
