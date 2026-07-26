# Share with Cognis users

## The share popup now supports user recipients

Search for Cognis users in the shared popup, attach them to a new share with read access, review recipients on existing shares, and remove access without leaving the popup. All recipient searches and share changes are routed through the Share gateway.

## Link and User are now Share gateway adapters

The popup presents supported methods in a top row and opens a separate, method-owned page for Link or User sharing. Historical shares are filtered by the selected method, while both types can coexist for the same resource.

## Each share method now shows its own controls

Link sharing displays link label and expiry customization, while User sharing displays recipient search, read/write permission, and expiry controls. Switching methods also replaces the visible history with shares of that type.

## Share method pages now load correctly

The Share gateway now registers each discovered adapter's static directory, so the Link and User popup pages load without a 404 response.

## Switching methods now replaces the page

The popup now mounts only the selected adapter's page. Link inputs are not present while sharing with users, and user search and permission controls are not present while creating a link.
