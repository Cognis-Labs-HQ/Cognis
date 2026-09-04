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

## Actionable ringing events in rooms

The current ringing invitation now appears in room history as a call card. Recipients can answer or decline with consequence-colored SVG controls, callers see the ringing state, and the entry automatically becomes a plain historical event after the call changes state or a newer call starts. Persisted incoming prompts survive shell navigation, and ringing tones use a stronger pulse.

## Stable PiP handoff and emphasized calls

Moving a meeting to picture-in-picture now happens only once, preserving the user-sized floating window. Messages immediately restores and redraws the conversation, hides the arrow, and disables the camera action until the component closes. Active incoming-call cards now have a shaded background and animated border, while past call events never retain answer or decline controls.

## PiP windows survive SPA navigation

Floating component windows are now portaled into the persistent document shell and can explicitly detach from their caller page lifecycle. SPA navigation discards ordinary component windows but preserves retained PiP calls until they are explicitly closed. Popover teardown now verifies top-layer state before hiding, preventing the browser NotSupportedError when a beforetoggle handler changes the popover state.

## Provider-owned call teardown

Retained PiP calls now portal their broker-owned stage together with the component window, preserving the stable stage ID expected by Jitsi Meet. When a participant leaves, is kicked, or the conference ends, Jitsi can resolve the parent stage and invoke `component-pages:discard`; Cognis then removes the disposable call stage without waiting for SPA cleanup.

## Room-aware call recovery

Messages now checks each room for an existing ringing or active call before rendering its camera action. Active calls display an active camera state and reconnect immediately when selected, including after refresh. Ringing calls are resumed or answered instead of creating a second invitation, and the server repeats the current-call check during creation to prevent crossed calls during concurrent clicks.

## Reliable caller handoff and isolated module filters

Call starts and notification answers now preserve a single-use user-activation permit through asynchronous signaling, so both participants can mount the Jitsi component when the invitation becomes active. Module sidebar filters also keep their intended borderless inactive state when a provider loads shared button styles during the call.

## Reusable calls and returnable PiP

Group calls now start after the first invitee answers, allow later invitees to join, and release after the final joined participant leaves so the next camera action rings everyone again. Floating-window spawn options can request a translucent close control; Messages uses it to return the same live call from PiP to the component stage. Provider-declared `allowNavigation` is now honored only while the call is floating in PiP and is revoked when the call returns inline.

## Stable PiP navigation and retained styles

Cognis now reads the Jitsi provider navigation permission from the component context and applies its requested minimum PiP size. Route styles remain mounted across SPA navigation, while Social Call uses capability-scoped class names so a live PiP meeting keeps all of its styling without leaking call-stage rules into other pages.

## Faster deterministic image installs

Production image dependency installation and pruning now skip npm audit and funding network requests. Docker builds no longer wait on optional registry endpoints after all packages have already been unpacked, and they no longer override proxy configuration with an unsupported npm environment key.

## Complete Jitsi capability alignment

Messages now publishes the room-membership resolver required by the current Jitsi Meet manifest. The capability validates that the requester is an active member and returns only active room account IDs, allowing Jitsi to authorize disposable VoIP meeting creation without accessing Messages storage directly.

## Disabled module configuration remains available

Core now loads disabled external module entrypoints in a restricted context that accepts only routes explicitly marked for disabled operation. Jitsi configuration endpoints can therefore be opened before enablement, while feature routes, UI contributions, flows, and capabilities remain inactive.

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
- https://github.com/Cognis-Labs-HQ/Cognis/commit/92f46be7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/14d4fbd5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a6d746bb
- https://github.com/Cognis-Labs-HQ/Cognis/commit/53dee857
- https://github.com/Cognis-Labs-HQ/Cognis/commit/630ac8d9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/4e75f696
- https://github.com/Cognis-Labs-HQ/Cognis/commit/59245f23
- https://github.com/Cognis-Labs-HQ/Cognis/commit/86cbe55e587061e6dd58927c20dd5c1fee530be9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7fa6ee9910ab1da664c9992dd88b5659fe0af400
- https://github.com/Cognis-Labs-HQ/Cognis/commit/930a3b084240205cd1e9ab4124e1bbfdbf6d2f52
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d4306538a8b51362f0c603c84c280eb3c00ce18d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/55fe7acc297c636ffa38791b448775f62b063159
- https://github.com/Cognis-Labs-HQ/Cognis/commit/734aa1e505f092db36fe2853ada1515ac0f0712a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b6e47c6553f8b24ae90e42631e3712617082c7a6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ff335be25d9d3858ae287ec0d84ee7c041fbc635
