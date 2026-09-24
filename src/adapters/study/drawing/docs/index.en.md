# Drawing Practice

## Purpose

The Drawing adapter contributes `study:drawing:open` to browser `uiCtx`. Callers pass a complete Library card and its validated `strokePattern`; the adapter opens a movable, resizable PiP writing pad.

## Practice model

The pad accepts pen, touch, and mouse input, enforces provider stroke order, scores direction and path proximity, tracks completed strokes, supports undo/reset, and provides four guidance levels from blank recall to the full pattern.

Stroke scoring uniformly resamples both paths and combines pointwise RMS deviation, endpoint placement, direction, and length ratio, remaining stable for dense complex characters. The first attempt displays the full pattern without exposing guidance controls or counters. A first consecutive mistake reveals the expected stroke, further mistakes reveal the next stroke and finally the complete pattern. Incorrect strokes trigger a red shake; completing the character triggers a green shake and a short generated success chime. The PiP requests dimensions that fit its square canvas and controls, scales the backing canvas independently in both axes, and follows the active light or dark theme.
