# Jitsi Meet Module

## Overview

The Jitsi Meet module adds direct user-to-user video rooms inside Cognis. It is implemented as a module under `src/modules/jitsi-meet` and keeps its own API routes, UI page, navbar contribution, admin section, language strings, and docs in one place.

Admins configure only one runtime value: the Jitsi base URL. Users create or resume sessions with one other participant from the meetings page.

## Responsibilities

- Persist module settings (`baseUrl`) in `jitsi_meet_settings`.
- Persist meeting entities in `jitsi_meetings` with FK participant columns referencing `accounts(id)`.
- Enforce participant pre-flight checks before returning meeting data.
- Build deterministic room slugs per participant pair.
- Provide a meetings UI that links to native Cognis chat by searching DM rooms at runtime.

Not responsible for: classroom meeting orchestration, adapter-level Jitsi provisioning, or overriding user consent.

## Architecture

- API entrypoint: `src/modules/jitsi-meet/api/index.js`
- Persistence store: `src/modules/jitsi-meet/api/store.js`
- User page: `src/modules/jitsi-meet/ui/app.js` + `app.html`
- Admin section: `src/modules/jitsi-meet/ui/admin-section.js`
- Navbar plugin: `src/modules/jitsi-meet/ui/navbar.js`

The API creates one meeting row per sorted participant pair and reuses it for repeat sessions. The user page resolves native chat dynamically from `/api/v1/messages/rooms` each time a session is opened or refreshed so chatroom IDs can shift without breaking linkage.

## Configuration

| Variable                       | Default               | Description                             |
| ------------------------------ | --------------------- | --------------------------------------- |
| Jitsi Base URL (admin setting) | `https://meet.jit.si` | Base URL used to build user join links. |

## API Routes

| Method | Path                                               | Description                                                 | Auth  |
| ------ | -------------------------------------------------- | ----------------------------------------------------------- | ----- |
| GET    | `/api/v1/modules/jitsi-meet/ping`                  | Health probe for module UI checks.                          | User  |
| GET    | `/api/v1/modules/jitsi-meet/config`                | Returns effective Jitsi base URL and toolbar defaults.      | User  |
| GET    | `/api/v1/modules/jitsi-meet/admin/settings`        | Returns persisted module settings.                          | Admin |
| POST   | `/api/v1/modules/jitsi-meet/admin/settings`        | Saves module settings.                                      | Admin |
| POST   | `/api/v1/modules/jitsi-meet/session`               | Creates or reuses a user-to-user meeting session.           | User  |
| GET    | `/api/v1/modules/jitsi-meet/meeting?meetingId=...` | Returns meeting details after participant pre-flight check. | User  |
