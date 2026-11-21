# Floating window gestures

**Feature Branch:** feature-floating-gestures643

## Keep one gesture owner

A floating window accepts one move or resize gesture at a time. Additional touches cannot replace it. Releasing or cancelling the owning pointer, or losing its capture, ends only that gesture and keeps the current position and size. A later gesture can start normally.

## Preserve window lifetime

The returned `release()` function and an optional caller-owned abort signal remove floating behavior and release its pointer capture; they do not remove caller content or invoke the close callback. Only the explicit Close control invokes that callback. Choose the signal for the intended window lifetime: persistent Call PiP intentionally omits a page signal, and route notifications alone do not close it.

Existing Focus and Drawing tutorial targets, steps and actions remain unchanged; interrupted gestures require no new tutorial branch.

## Commits

- [742678fa26b97f0838d7c4de96895da5ce9aeb56](https://github.com/Cognis-Labs-HQ/Cognis/commit/742678fa26b97f0838d7c4de96895da5ce9aeb56)
- [51570e6ec3e3af22aca23ec39c338cbc4452e0c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/51570e6ec3e3af22aca23ec39c338cbc4452e0c4)
