# Module Settings Popups Match Adapters

**Feature Branch:** feature-investigate-nextcloud-module-settings-loading-issue

## Module rows now open unified settings

Jitsi Meet and Nextcloud Whiteboard now open their configuration from the module row itself instead of a separate cog, matching adapter configuration behavior.

## Settings include module power controls

The module settings popup now includes an enable toggle so administrators can adjust configuration and power state together.

## Missing dependencies show a clear settings error

Nextcloud Whiteboard still registers its settings endpoints when required runtime dependencies are unavailable, so administrators receive a service-unavailable response instead of a missing-route 404.

## Partial updates can be saved before the secret is set

Nextcloud Whiteboard settings now accept server URL and upload-limit updates even when the API key field is intentionally left empty, while still reporting the module as not fully configured until a valid key is provided.

## Field-level validation keeps settings open

Module settings validation errors now identify the invalid field, allowing the shared config popup to stay open and mark that input instead of discarding valid administrator edits.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e33bb93726bab2eb01bf3d24f3704d2b4127dda0
