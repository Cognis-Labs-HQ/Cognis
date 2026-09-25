# Drawing Practice

## Purpose

The Drawing adapter contributes `study:drawing:open` to browser `uiCtx`. Callers pass a complete Library card and its validated `strokePattern`; the adapter opens a movable, resizable PiP writing pad.

## Practice model

The pad accepts pen, touch, and mouse input, enforces provider stroke order, scores direction and path proximity, tracks completed strokes, and provides Reset without reversing learned guidance.

Only the current stroke is guided. Its complete path is shown initially; successful strokes progressively shorten later guidance, while repeated mistakes extend the current guide from its beginning through its endpoint. Reset clears the written strokes without restoring the earlier guidance extent. Incorrect strokes trigger a red shake; completing the character triggers a green shake and a short generated success chime. The heading aligns the card text and localized definition beside one another, and the content-sized close control participates in open and close animations.

The heading is measured to the rendered canvas and centered directly above it. Feedback motion uses restrained translations and rotations, and every accepted input stroke is replaced with the provider’s canonical stroke path so the completed character remains visually accurate.
