# Video calling groundwork for Messages

**Feature Branch:** feature-expose-voip-calling-capability-in-messages-page

## Provider-neutral chat call action

Direct and group chats now show an accessible video-camera action whenever a browser VoIP provider is available. The action sends the complete room membership and a picture-in-picture presentation request through a staged ctx flow without coupling Messages to Jitsi.

## Module VoIP providers load before Messages

External modules can now declare browser capabilities on their registered navigation plug-ins. Cognis includes those scripts in capability-provider discovery, so Jitsi can contribute `voip:startCall` before Messages checks availability and renders the video-camera action.

## Room-aware VoIP actions

Messages now asks the provider for an action for each room. Providers can hide calling, request a host-owned component window with meeting context, or route to an existing meeting. Temporary component stages are removed after closure and failed launches are logged and shown as a toast without changing the chat height.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
