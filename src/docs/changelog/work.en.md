# Reliable module administration startup

## Wait for module routes before accepting requests

The API now completes module state restoration and extension-route registration before handling requests, preventing transient 404 responses from configuration endpoints and failed direct enable attempts during startup.
