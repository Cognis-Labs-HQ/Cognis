# Floating window gestures

**Feature Branch:** feature-floating-gestures643

## Keep one gesture owner

A floating window accepts one move or resize gesture at a time. Additional touches cannot replace it. Releasing or cancelling the owning pointer, or losing its capture, ends only that gesture and keeps the current position and size. A later gesture can start normally.

## Preserve window lifetime

The returned `release()` function and an optional caller-owned abort signal remove floating behavior and release its pointer capture; they do not remove caller content or invoke the close callback. Only the explicit Close control invokes that callback. Choose the signal for the intended window lifetime: persistent Call PiP intentionally omits a page signal, and route notifications alone do not close it.

Existing Focus and Drawing tutorial targets, steps and actions remain unchanged; interrupted gestures require no new tutorial branch.

## Commits

- [73040a8f0a1c14ddc0be243655e450d3a7db8598](https://github.com/Cognis-Labs-HQ/Cognis/commit/73040a8f0a1c14ddc0be243655e450d3a7db8598)
- [e8f4f04019d75da644ce3d37df4e2624f10f4e32](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8f4f04019d75da644ce3d37df4e2624f10f4e32)
