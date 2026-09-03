# Video calling groundwork for Messages

**Feature Branch:** feature-expose-voip-calling-capability-in-messages-page

## Provider-neutral chat call action

Direct and group chats now show an accessible video-camera action whenever a browser VoIP provider is available. The action sends the complete room membership and a picture-in-picture presentation request through a staged ctx flow without coupling Messages to Jitsi.

## Module VoIP providers load before Messages

External modules can now declare browser capabilities on their registered navigation plug-ins. Cognis includes those scripts in capability-provider discovery, so Jitsi can contribute `voip:startCall` before Messages checks availability and renders the video-camera action.

## Room-aware VoIP actions

Messages now asks the provider for an action for each room. Providers can hide calling, request a host-owned component window with meeting context, or route to an existing meeting. Temporary component stages are removed after closure and failed launches are logged and shown as a toast without changing the chat height.

## Inline calls move cleanly to PiP

Call components now open between the thread header area and message list, matching the embedded component-window approach used by meeting whiteboards. A top-left back control moves the call into picture-in-picture, restores the normal Messages layout, and leaves no stale stage after the call closes.

## Button styles survive Meetings navigation

Shared consequence-button styles now live in their own reusable stylesheet and remain persistent for the dashboard shell. Leaving Meetings unloads only its route-specific styles, so neutral side-menu and action buttons retain their borders, colors, hover states, and disabled states on every destination page.

## Versioned styles reload after SPA cleanup

SPA stylesheet readiness is now keyed by normalized path rather than the full versioned URL. When leaving Meetings removes route CSS, a later page can load the same versioned page-builder stylesheet again instead of reusing a stale resolved promise and rendering with incomplete styles.

## Ringing calls are owned by a Call adapter

A new Call adapter now owns room authorization, invitation state, a 45-second unanswered timeout, answering, hangup, notifications, and VoIP-provider handoff. Starting a call immediately replaces the conversation with a ringing screen and activates the camera control; recipients receive a persistent notification with an Answer action. Meetings begin only after acceptance, and the separate arrow control moves the mounted component to picture-in-picture.

## Incoming-call decisions stay visible

Incoming calls now remain in the transient-notification area with green Answer and red Decline controls instead of appearing in the notification-bell list. Messages temporarily promotes the ringing room to the top of its sidebar, then restores its original position when the call ends. Callers and recipients receive specific feedback for cancellation, rejection, timeout, and provider refusal.

## Call history and ringing tones

Call lifecycle transitions are now persisted as room events visible to every participant. The Call adapter plays distinct repeating inbound and outbound tones while an invitation is ringing, and a caller who cancels their own invitation no longer receives a misleading declined-call message.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
- https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b62797540e433c07ee81751a58e327085f01739
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0e7ff946
- https://github.com/Cognis-Labs-HQ/Cognis/commit/60ad8491
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbcc6537
- https://github.com/Cognis-Labs-HQ/Cognis/commit/263c98cc
