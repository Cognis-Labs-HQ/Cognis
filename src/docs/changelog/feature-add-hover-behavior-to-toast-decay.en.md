# Pausable Toast Timeouts

**Feature Branch:** feature-add-hover-behavior-to-toast-decay

## Toasts wait while hovered

Hovering over a temporary toast now pauses its decay and hides its time bar. Moving the pointer away restores the time bar and restarts the toast's full configured timeout.

Temporary toasts can also be dismissed by dragging them to the right with a mouse or touchscreen and releasing. Users can drag a toast back before releasing to cancel the gesture and resume its normal behavior. Permanent toasts remain fixed until their dismiss control is used.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9f860c0f2d5ebf90f5af70bc0a44daa414958713
