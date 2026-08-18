# Nextcloud Whiteboard module

The Nextcloud Whiteboard module adds collaborative drawing canvases to Cognis without embedding or scraping the Nextcloud web UI. Cognis renders its own page-composer based whiteboard surface, mints short-lived server-side session tokens, and connects the browser directly to the configured Nextcloud Whiteboard Socket.IO server.

## Architecture

- **Cognis API** stores configuration, creates whiteboard records, enforces the Cognis allow-list, and signs Socket.IO session JWTs with the administrator-provided API key.
- **Cognis UI** renders the board list and drawing canvas as page-composer elements so the canvas can be embedded in future dashboards, classrooms, and meeting layouts.
- **Nextcloud Whiteboard server** receives the signed token over Socket.IO and synchronizes Excalidraw-compatible element updates.

The API key never leaves the Cognis server. Browsers receive only a short-lived JWT for the selected board.

## Administrator setup

1. Enable the module and open **Nextcloud Whiteboard Settings** from administration.
2. Enter the **Whiteboard Server URL** for the standalone Socket.IO service, for example `https://whiteboard.example.com:3002`.
3. Enter the shared API key used by the whiteboard server. Cognis requires at least 16 characters.
4. Save the settings. Cognis registers the configured server origin for script and websocket CSP access.

## User workflow

Users open **Whiteboards** from the navigation bar or a contributed dashboard element. They can create a board, list boards they can access, and open a board directly inside the page layout. The canvas supports pen, eraser, color, stroke width, clearing, connection status, and live remote updates.

## Access control

Every board has an owner and an explicit participant allow-list. Cognis checks the signed-in user's profile handle before returning board data or minting a session token. Hidden profiles are excluded from participant resolution unless the server flow explicitly includes them.

## Integration capabilities

The module contributes `nextcloud-whiteboard:api`, `nextcloud-whiteboard:spawnWhiteboardWindow`, `whiteboard:getEmbedUrl`, and `whiteboard:fetchBoardData`. Integrations should use these capabilities instead of hard-coding routes so future render targets can reuse the same access checks.

## Distribusi eksternal

Nextcloud Whiteboard bersifat mandiri untuk dipisahkan ke `Cognis-Labs-HQ/cognis-module-nextcloud-whiteboard`. Manifesnya menyatakan dependensi komponen sebagai UUID secara terpisah dari setiap kapabilitas server dan `ui:*` yang digunakan. Manifes root, paket, rute, lisensi, aset, CLI, API, UI, dokumentasi terjemahan, dan hash integritas didistribusikan bersama.
