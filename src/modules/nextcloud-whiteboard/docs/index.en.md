# Nextcloud Whiteboard Module

## Overview

The Nextcloud Whiteboard module integrates Nextcloud's collaborative whiteboard application into Cognis classrooms. When the module is enabled and configured with a Nextcloud instance, teachers can open a whiteboard board inside the classroom workspace and students join the same board in real time. The integration uses signed JWT tokens so Cognis users never need a Nextcloud account of their own.

The module contributes the `whiteboard:getEmbedUrl` and `whiteboard:fetchBoardData` capabilities so the classroom adapter can open whiteboards without importing any module internals directly.

## Responsibilities

- Mint short-lived JWT tokens for embedding Nextcloud Whiteboard boards inside an iframe.
- Expose API routes for creating, retrieving, and configuring whiteboard boards scoped to a classroom.
- Provide the admin configuration popup so operators can supply the Nextcloud instance URL, app secret, and board defaults.
- Register the `whiteboard:getEmbedUrl` and `whiteboard:fetchBoardData` capabilities through `ctx`.
- Serve the browser-side whiteboard window component and admin config popup as static assets.

Not responsible for: storing board content (Nextcloud owns that), managing Nextcloud users or permissions (the JWT handles trust delegation), or classroom membership checks (the classes adapter enforces those before calling whiteboard capabilities).

## Architecture

`src/modules/nextcloud-whiteboard/bootstrap.js` is the module entry point. It:

1. Reads the Nextcloud instance URL and app secret from environment variables.
2. Registers API routes via `ctx.routeRegistry`.
3. Contributes `whiteboard:getEmbedUrl` and `whiteboard:fetchBoardData` capabilities through `ctx.capabilities`.
4. Registers static assets served at `/static/modules/nextcloud-whiteboard/`.

JWT minting for embed URLs lives entirely in `bootstrap.js` and is never exposed as a shared helper. The `api/config-state.js` file holds the in-memory config state shared between admin routes and capability implementations.

### Classroom integration

The classroom adapter (`src/adapters/study/classes/`) opens whiteboards by querying `ctx.getCapability("whiteboard:getEmbedUrl")`. This keeps the classroom adapter free of any Nextcloud-specific code and makes the whiteboard pluggable.

## Configuration

| Variable                      | Default  | Description                                                                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `NEXTCLOUD_URL`               | _(none)_ | Base URL of the Nextcloud instance (e.g. `https://cloud.example.com`). Required for whiteboard embeds to function. |
| `NEXTCLOUD_WHITEBOARD_SECRET` | _(none)_ | Shared app secret used to sign JWT tokens for Nextcloud Whiteboard.                                                |

## API Routes

| Method | Path                                              | Description                        | Auth     |
| ------ | ------------------------------------------------- | ---------------------------------- | -------- |
| `GET`  | `/api/v1/modules/nextcloud-whiteboard/config`     | Fetch current admin configuration  | Admin    |
| `PUT`  | `/api/v1/modules/nextcloud-whiteboard/config`     | Update admin configuration         | Admin    |
| `POST` | `/api/v1/modules/nextcloud-whiteboard/boards`     | Create a new whiteboard board      | Required |
| `GET`  | `/api/v1/modules/nextcloud-whiteboard/boards/:id` | Fetch board metadata and embed URL | Required |
