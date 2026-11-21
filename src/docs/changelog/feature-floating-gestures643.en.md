# Floating window gestures

**Feature Branch:** feature-floating-gestures643

## Keep one gesture owner

A floating window accepts one move or resize gesture at a time. Additional touches cannot replace it. Releasing or cancelling the owning pointer, or losing its capture, ends only that gesture and keeps the current position and size. A later gesture can start normally.

## Preserve window lifetime

The returned `release()` function and an optional caller-owned abort signal remove floating behavior and release its pointer capture; they do not remove caller content or invoke the close callback. Only the explicit Close control invokes that callback. Choose the signal for the intended window lifetime: persistent Call PiP intentionally omits a page signal, and route notifications alone do not close it.

Existing Focus and Drawing tutorial targets, steps and actions remain unchanged; interrupted gestures require no new tutorial branch.

## Commits

- [542505b0130b6c0399b0977f114be7e777671b8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/542505b0130b6c0399b0977f114be7e777671b8d)
- [a69ef179c0ecb4727736cba606aabfa666d38cb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a69ef179c0ecb4727736cba606aabfa666d38cb8)
- [f1f303e2f57447d6524ea0605a6d20a7f3937554](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1f303e2f57447d6524ea0605a6d20a7f3937554)
