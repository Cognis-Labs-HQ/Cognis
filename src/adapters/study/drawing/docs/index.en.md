# Drawing Practice

## Purpose

The Drawing adapter contributes `study:drawing:open` to browser `uiCtx`. Callers pass a complete Library card and its validated `strokePattern`; the adapter opens a movable, resizable PiP writing pad.

## Practice model

The pad accepts pen, touch, and mouse input, enforces provider stroke order, scores direction and path proximity, and replaces every accepted input with the provider's canonical stroke. At the beginning of an attempt, every stroke is visible. After the first accepted stroke, the pad reveals only the next required stroke while retaining completed canonical strokes.

Incorrect strokes produce restrained red feedback without restarting the pad's opening animation. Completing the character plays a short success chime and displays a stable completion overlay with a tick, the attempt's mistake count, and Close and Try Again actions. Try Again starts a fresh attempt with every guide visible. Pointer input is painted at most once per animation frame to keep the canvas stable.

The heading is measured to the rendered canvas and centered directly above it. The card text and localized definition remain aligned, and the content-sized close control uses an explicit close animation.

The first guide view labels every stroke and shows its direction. Ten consecutive misses end the attempt with a failure result. Successful attempts with at most one mistake raise that card's in-memory difficulty for later attempts, and an open pad can switch directly to another Library card.
