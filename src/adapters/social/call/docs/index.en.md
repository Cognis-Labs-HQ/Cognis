# Call signaling

The Call adapter owns room-scoped call invitations, ringing, answering, hangup, timeout, and browser provider handoff. Messages only consumes its `social:callUi` capability.

A call starts in a ringing surface that replaces chat history and the composer while retaining the thread header. The recipient receives a persistent Calls notification whose Answer action opens the room with the call token. Calls expire after 45 seconds if unanswered. Once answered, the adapter invokes `voip:startCall` with `phase: connect`; the provider returns a component or navigation action. Embedded meeting controls remain separate from the Call toolbar, whose arrow moves the meeting to picture-in-picture and restores Messages.

## Usage examples

The Call adapter is activated automatically when Messages and a `voip:startCall` browser provider are available.

## Technical specification

The `social:callUi` capability owns invitation state, the 45-second timeout, notification answer links, component mounting, hangup, and provider handoff.

Incoming calls do not enter the notification-bell list. They remain in the transient-notification area until answered, declined, or expired, with green Answer and red Decline controls. While Messages is open, the associated room moves temporarily to the top of the room list. Callers receive distinct feedback when they cancel, the recipient declines, nobody answers, or the meeting provider refuses the handoff.

Each call transition is persisted in the Messages room history as a room event, so every participant sees who started, answered, cancelled, or declined the call and when a call went unanswered. The browser plays repeating, distinct inbound and outbound synthesized ringing tones until the invitation is answered, declined, cancelled, or expires.

While the newest invitation is ringing, its room event is an actionable call card: recipients can answer or decline in the conversation, while callers see a ringing state. Once that call changes state—or a newer call begins—the historical entry becomes a plain event without actions. Incoming-call prompts are restored from their persisted notification on shell startup, and the ringing tone uses a stronger repeating pulse.

Moving an accepted component to picture-in-picture is idempotent: subsequent arrow activation does not recreate or resize the floating window. The first activation hides the arrow and inline stage, restores and refreshes the conversation, and disables the room camera action until the component closes. Active call cards use a shaded surface and animated border; completed call events never retain answer or decline controls.

After a call component is moved to picture-in-picture, it is portaled to the persistent document shell and retained across caller-page aborts and SPA route cleanup. Explicit component closure still performs full cleanup and restores its original host when that host remains connected.

The retained PiP portal keeps the broker-owned component stage around the window, including its stable element ID. Providers such as Jitsi can therefore resolve their containing stage and invoke the host `component-pages:discard` capability when a participant leaves, is kicked, or the conference terminates; disposable call stages are removed after that discard.

Before exposing a room call action, the Call UI queries the authenticated room-state endpoint. An active call marks the camera action active and clicking it immediately reconnects through the existing provider meeting. A ringing call is reused instead of creating another invitation: the caller resumes waiting and another participant answers the existing call. The server repeats the same current-call check atomically before creation to prevent crossed invitations during races.

Component providers may finish resolving only after the original click has returned. The Call UI therefore captures the core's single-use component spawn permit synchronously during Start or Answer and passes it to the eventual component mount. The permit expires after 60 seconds and cannot authorize a second window.
