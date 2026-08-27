# Safer module startup

## Disabled modules remain unloaded

Disabled external modules are no longer imported or bootstrapped during route refreshes, preventing their top-level and lifecycle code from running.

## Private source scans wait for credentials

Startup discovery now scans only public module sources. Credentialed private sources remain available for authenticated marketplace polling without a credentialless attempt delaying their next refresh.
