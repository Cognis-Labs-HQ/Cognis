# Whiteboard in Dashboard

**Feature Branch:** feature-create-nextcloud-whiteboard-integration-module-yvnc2f

## Canvas is now embedded directly in the dashboard layout

The whiteboard canvas no longer opens as a browser popup. Clicking a board from the board list loads the full drawing canvas inline within the dashboard, keeping all collaboration in one tab.

## Pre-flight check verifies server reachability before any canvas launch

Before the canvas connects, a server-reachability check confirms that the whiteboard server URL is configured and responsive. A clear error message is shown if configuration is missing or the server is unreachable, preventing silent failure.

## Full drawing tooling is preserved in-dashboard

The embedded canvas includes the complete toolbar — pen, eraser, stroke colour, stroke width, and clear — matching every feature that was previously available in the popup window.

## Real-time collaboration via Socket.IO is unchanged

Socket.IO connection and element sync continue to operate as before; the only change is that the canvas is mounted inside the page composer grid element rather than a separate browser window.

## JWT session tokens are minted server-side for secure, credential-free client connections

When a user opens a whiteboard, the Cognis server mints a short-lived JWT (signed with the configured API key) and returns it to the client. The client then authenticates with the Nextcloud Whiteboard server using this token, keeping the API key strictly server-side.

## Separate collaboration server URL in admin settings

Admins configure a dedicated **Whiteboard Server URL** pointing to the standalone Nextcloud Whiteboard collaboration server endpoint. This decouples the Nextcloud instance URL from the Socket.IO server address and accommodates any port or host configuration.

## New capabilities: `whiteboard:getEmbedUrl` and `whiteboard:fetchBoardData`

Other modules and adapters can obtain a whiteboard's embed URL or metadata through these public capabilities, enabling future classroom and meeting integrations.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3fba3a4ae030e1c17efc8f85e1245ceb69bc135d
