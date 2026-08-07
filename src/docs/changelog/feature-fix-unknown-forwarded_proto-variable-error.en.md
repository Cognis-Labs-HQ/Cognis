# Reliable nginx Startup

## Protect nginx Variables

The web container now limits template substitution to the Cognis upstream host and uses a Cognis-namespaced forwarding variable. Requests arriving through a TLS-terminating proxy retain HTTPS, while direct requests without a forwarded protocol safely fall back to the nginx connection scheme.
