# Nextcloud Whiteboard: WSS Native Canvas

## Native whiteboard canvas connects directly to Nextcloud Whiteboard collaboration server via WebSocket

The previous implementation redirected users to Nextcloud's own frontend. The whiteboard now opens as a native canvas in a popup window and connects directly to the Nextcloud Whiteboard collaboration server (Socket.IO / WSS) — no iframe required.

## JWT session tokens are minted server-side for secure, credential-free client connections

When a user opens a whiteboard, the Cognis server mints a short-lived JWT (signed with the configured API key) and returns it to the client. The client then authenticates with the Nextcloud Whiteboard server using this token, keeping the API key strictly server-side.

## Separate collaboration server URL in admin settings

Admins now configure a dedicated **Whiteboard Server URL** pointing to the standalone Nextcloud Whiteboard collaboration server endpoint. This decouples the Nextcloud instance URL from the Socket.IO server address and accommodates any port or host configuration.

## Whiteboard list page shows an Open button per board

Each board card on the Whiteboards page now displays an **Open** button that launches the native canvas in a popup window, making the interaction explicit and accessible.

## New capabilities: `whiteboard:getEmbedUrl` and `whiteboard:fetchBoardData`

Other modules and adapters can now obtain a whiteboard's embed URL or metadata through these public capabilities, enabling future classroom and meeting integrations.
