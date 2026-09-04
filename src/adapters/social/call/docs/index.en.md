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

Moving an active component to picture-in-picture keeps the provider mounted in its stable component host. The bounded host becomes the floating surface, clips provider content to its dimensions, and exposes an optional translucent close control that returns the same live component to the Messages call stage.

An active call records the accounts currently joined. The caller and first respondent are sufficient to activate a group call; additional invitees may join afterward. Provider teardown makes the local account leave, and the call is released after the final joined account leaves, allowing the camera action to create a fresh invitation and notify every other room participant.

Component providers may finish resolving only after the original click has returned. The Call UI therefore captures the core’s single-use component spawn permit synchronously during Start or Answer and passes it to the eventual component mount. The permit expires after 60 seconds and cannot authorize a second window.

Providers may set `context.allowNavigation: true` on their component action and may provide `minSize` for the PiP surface. The Call UI passes that permission into the component spawn and moves the PiP host into the persistent shell, but enables navigation retention only after the call enters PiP; returning the call to Messages immediately restores the caller-page navigation restriction.
