# Module CLI Coverage

## Module API commands added

Added Cognisctl commands for module backend endpoints that previously required direct HTTP calls, including Analytics activity views, Jitsi Meet administration, and Nextcloud Whiteboard operations.

## API bootstrap health contributors fixed

Ensured the API bootstrap shares the same health service with the server so component health contributors can register without crashing startup.
