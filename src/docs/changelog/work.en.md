# Require the public host

## Compose now requires the deployment URL

The application image no longer supplies localhost as its public host. Both database Compose profiles require `EXTERNAL_HOST`, preventing authentication, invitation, and notification links from pointing to each recipient's local machine.
