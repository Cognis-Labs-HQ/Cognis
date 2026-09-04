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

## Complete host UI capability catalog

Core now advertises its component-page spawn, component-page discard, and floating-window browser capabilities through the UI provider registry. Module enablement validates every capability declared by the current Jitsi Meet manifest without rejecting these core-owned browser contracts, and provider loading imports the router bundle that installs them.

## Provider-neutral notification actions and Messages flows

Internal notifications now render producer-supplied action labels and sanitized SVGs through a neutral continuous-notification contract. Messages owns generic room-action flows that Calls extends, removing Messages’ static Call capability knowledge. Ringing uses a longer double-pulse cadence.

## User-only room discovery

The Messages New Room picker now passes the shared search utility’s user category and type filter, matching the filtered-search parameters used by Jitsi Meet and excluding unrelated result types.

## Responsive search status

Search now replaces the minimum-length prompt with a loading state as soon as an eligible query runs. Failed and timed-out requests render an explicit error instead of leaving stale results or an unresponsive prompt.

## Synchronized incoming-call prompts

Incoming calls now appear in a bar immediately above the Messages thread header. Answer and Decline resolve the correlated notification and in-chat prompt together, while a per-user ringing lease prevents multiple tabs or surfaces from playing duplicate ringtones.

## Visible call bar and focused PiP

Incoming-call state now refreshes the selected room so its action bar appears directly below the thread header while the notification may remain visible. Spawned VoIP components are explicitly marked with the Jitsi Meet `voipCall` context, keeping meeting chat out of the PiP surface.

## Safe PiP teardown

Closing a VoIP call in PiP now validates the original portal hierarchy and safely falls back when the browser rejects a state-preserving atomic move. Component teardown can finish without an unhandled `HierarchyRequestError`.

## Full-height docked call stage

Docked provider calls now use the full remaining height of the Messages widget card. The active thread collapses to header and call-stage rows, while the stage, component host, and component window all stretch through the available content row.

## Reliable ringing cleanup and PiP return

Late ringing-lease requests now succeed with a non-ringing result after a call has ended. Closing a call from PiP after SPA navigation offers Return to Messages, Hang Up, and Cancel with consequence-appropriate actions. Returning navigates to the call room and restores the existing provider component without remounting it.

## Stable PiP close control

The PiP close action now retains the active call in its stage lifecycle, eliminating the navigation-time `ReferenceError`. The close control again uses the standard floating-window size and now carries the destructive `btn-cancel` class.

## Idempotent leave and repeat PiP persistence

Late provider teardown no longer reports an error when the server has already ended the call; leave now succeeds idempotently and cleanup suppresses the known unavailable-call race. Returning to Messages and entering PiP a second time now preserves the call across the next SPA navigation.

## Security, lifecycle, and test-suite corrections

Call rendering now inserts participant-controlled labels through text nodes, call operations revalidate current Messages membership, archived rooms are excluded, active group joiners are registered, rejected ringing renewals stop audio, aborted outbound polling cancels invitations, and provider contracts retain the actual room kind. Incoming call copy is supplied in all supported locales through neutral notification metadata. The shared search matcher was split into a dedicated API-results module to satisfy the 1,000-line limit, and stale Messages, notification, and hardcoded-string tests were corrected without deleting newlines.

## Standalone reusable call icons

Call action SVGs now live in Call-owned asset files. The same video asset supplies the Messages room action, while notification and in-room answer and decline controls reuse their corresponding assets without embedding SVG markup in source code.

## Isolated call history integration

Messages now exposes a generic room-event persistence capability and a staged formatting flow. Calls owns and injects its event types, localized text, and presentation, so the Messages store, renderer, and language resources no longer contain call-specific contracts.

## Hardened call and module lifecycles

Active calls can now be ended only by joined participants, callers and invitees rejoin signaling before reconnecting, and failed leave requests retain retryable joined state. Calls owns notification-to-room-state translation, the redundant Meeting Window label is gone, disabled modules use an isolated configuration entrypoint without executing their normal bootstrap, API-result exports are fully documented, and the room-event flow uses camel case.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6bf285c42a978273d039d2547d17e827512f4b26
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea665452e791853c2fd72b8dfa141b0a7a1f1ecb
- https://github.com/Cognis-Labs-HQ/Cognis/commit/968d9fb49a0df9e137ab7ab0606b5950ef759e26
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
- https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b62797540e433c07ee81751a58e327085f01739
- https://github.com/Cognis-Labs-HQ/Cognis/commit/86cbe55e587061e6dd58927c20dd5c1fee530be9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7fa6ee9910ab1da664c9992dd88b5659fe0af400
- https://github.com/Cognis-Labs-HQ/Cognis/commit/930a3b084240205cd1e9ab4124e1bbfdbf6d2f52
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d4306538a8b51362f0c603c84c280eb3c00ce18d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/55fe7acc297c636ffa38791b448775f62b063159
- https://github.com/Cognis-Labs-HQ/Cognis/commit/734aa1e505f092db36fe2853ada1515ac0f0712a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b6e47c6553f8b24ae90e42631e3712617082c7a6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ff335be25d9d3858ae287ec0d84ee7c041fbc635
- https://github.com/Cognis-Labs-HQ/Cognis/commit/81b69ddc13d7ffba92acfaa9e3067907bfa0b55b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e9735b3df0ec8a939a9598eadc7d3681fa512594
- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713
