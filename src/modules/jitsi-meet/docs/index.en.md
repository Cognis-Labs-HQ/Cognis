# Jitsi Meet Module

## Overview

The Jitsi Meet module is a standalone module (`src/modules/jitsi-meet`) that provides Cognis-governed meeting orchestration for user pairs and classroom/manual entities.

It exposes:

- a global **Meetings** navbar entry,
- a page-composer-based Meetings page with separate editable panes (meeting window, participant controls, chat window),
- admin-managed Jitsi instance configuration,
- DB-backed reusable meeting entities and participant enforcement.

## Security Model

- Meeting URLs are generated server-side from deterministic room slugs and not displayed as copyable UI metadata.
- Native Jitsi chat is disabled in favor of Cognis-native chat linkage.
- Participant membership is enforced by Cognis via module DB membership checks.
- Only the meeting owner can update participant membership.

## Runtime Features

- Follower-filtered participant source by default (switchable to all visible users).
- Drag-and-drop participant assignment between available and selected pools.
- Reusable room identity for:
    - user pair meetings,
    - classroom/manual entity meetings.
- Overlay controls on the meeting pane:
    - moderation auth popup,
    - PiP,
    - new tab,
    - reconnect.
- Moderation/password challenge handoff via popup flow and Jitsi iframe API events.
- User identity handoff to Jitsi (`displayName`, optional avatar URL).

## API Surface

| Method | Path                                              | Description                                           |
| ------ | ------------------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/v1/modules/jitsi-meet/ping`                 | Module health probe                                   |
| GET    | `/api/v1/modules/jitsi-meet/config`               | Effective Jitsi config                                |
| GET    | `/api/v1/modules/jitsi-meet/participants`         | Participant candidates (`filter=followers\|all`, `q`) |
| GET    | `/api/v1/modules/jitsi-meet/admin/settings`       | Read admin settings                                   |
| POST   | `/api/v1/modules/jitsi-meet/admin/settings`       | Update admin settings                                 |
| POST   | `/api/v1/modules/jitsi-meet/session`              | Create/reuse meeting entity and return join context   |
| GET    | `/api/v1/modules/jitsi-meet/meeting`              | Read a meeting by `meetingId` with member enforcement |
| POST   | `/api/v1/modules/jitsi-meet/meeting/participants` | Replace participant membership (owner only)           |
