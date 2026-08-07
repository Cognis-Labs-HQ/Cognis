# Safer container startup

## Preserve HTTPS forwarding

The web proxy now preserves an incoming HTTPS scheme so authentication cookies remain secure behind a TLS terminator.

## Generate deployment secrets

The setup command now provisions private database passwords and a data-encryption key before Compose starts.
