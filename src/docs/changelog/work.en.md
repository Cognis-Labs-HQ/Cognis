# Module Settings Popups Match Adapters

## Module rows now open unified settings

Jitsi Meet and Nextcloud Whiteboard now open their configuration from the module row itself instead of a separate cog, matching adapter configuration behavior.

## Settings include module power controls

The module settings popup now includes an enable toggle so administrators can adjust configuration and power state together.

## Missing dependencies show a clear settings error

Nextcloud Whiteboard still registers its settings endpoints when required runtime dependencies are unavailable, so administrators receive a service-unavailable response instead of a missing-route 404.
