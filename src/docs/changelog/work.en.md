# Reliable nginx Startup

## Protect nginx Variables

The web container now limits template substitution to the Cognis upstream host. Native nginx variables, including the forwarded protocol map, remain intact even when similarly named deployment environment variables are present.
