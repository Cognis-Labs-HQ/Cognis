# Nextcloud Whiteboard configuration lifecycle

## Keep configuration independent from profile services

Nextcloud Whiteboard now registers its configuration and enablement endpoints as soon as database storage is available. Administrators can configure the module even when the separate profile service needed for whiteboard collaboration is unavailable.
