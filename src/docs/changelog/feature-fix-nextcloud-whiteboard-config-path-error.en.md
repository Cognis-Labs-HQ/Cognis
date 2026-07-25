# Reliable module administration startup

## Register collaboration routes before profile initialization

Nextcloud Whiteboard now registers its board listing and preflight routes even when the profile service initializes later. Requests resolve the current profile capability, preventing transient route-not-found responses during startup.

## Scope startup readiness to the owning module

Startup reliability is handled within Nextcloud Whiteboard rather than by delaying every API request. This keeps the shared server lifecycle unchanged while making the affected administration routes available independently of profile services.

## Keep configuration independent from profile services

Nextcloud Whiteboard now registers its configuration and enablement endpoints as soon as database storage is available. Administrators can configure the module even when the separate profile service needed for whiteboard collaboration is unavailable.
