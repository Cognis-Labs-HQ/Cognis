# Call signaling

The Call adapter owns room-scoped call invitations, ringing, answering, hangup, timeout, and browser provider handoff. Messages only consumes its `social:callUi` capability.

A call starts in a ringing surface that replaces chat history and the composer while retaining the thread header. The recipient receives a persistent Calls notification whose Answer action opens the room with the call token. Calls expire after 45 seconds if unanswered. Once answered, the adapter invokes `voip:startCall` with `phase: connect`; the provider returns a component or navigation action. Embedded meeting controls remain separate from the Call toolbar, whose arrow moves the meeting to picture-in-picture and restores Messages.

## Usage examples

The Call adapter is activated automatically when Messages and a `voip:startCall` browser provider are available.

## Technical specification

The `social:callUi` capability owns invitation state, the 45-second timeout, notification answer links, component mounting, hangup, and provider handoff.
