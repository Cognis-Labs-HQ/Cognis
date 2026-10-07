# Drawing Practice

## Purpose

The Drawing adapter contributes `study:drawing:open` to browser `uiCtx`. Callers pass a complete Library card and its validated `strokePattern`; the adapter opens a movable, resizable PiP writing pad.

## Practice model

The pad accepts pen, touch, and mouse input, enforces provider stroke order, scores direction and path proximity, and replaces every accepted input with the provider's canonical stroke. At the beginning of an attempt, every stroke is visible. After the first accepted stroke, the pad reveals only the next required stroke while retaining completed canonical strokes.

Incorrect strokes produce restrained red feedback without restarting the pad's opening animation. Completing the character plays a short success chime and displays a stable completion overlay with a tick, the attempt's mistake count, and Close and Try Again actions. Try Again starts a fresh attempt with every guide visible. Pointer input is painted at most once per animation frame to keep the canvas stable.

The heading is measured to the rendered canvas and centered directly above it. The card text and localized definition remain aligned, and the content-sized close control uses an explicit close animation.

The first guide view labels every stroke and shows its direction. Ten consecutive misses end the attempt with a failure result. Successful attempts with at most one mistake raise that card's in-memory difficulty for later attempts, and an open pad can switch directly to another Library card.

The **?** guidance action preserves accepted strokes and attempt results while revealing annotations only for unfinished strokes. Retrying keeps progressive guidance. Composite patterns carry piece boundaries so each newly reached character receives one complete annotated preview. Annotation direction is calculated in rendered canvas coordinates, keeping arrows accurate across extended multi-character patterns.

Composite cards now arrange every writing-unit pattern from the primary written value side by side at a consistent scale with minimal spacing. The pad expands to preserve character size, and its compact heading includes available pronunciations and the localized definition.

The pad remains inside the viewport, uses a compact content-derived height, and caps its width at forty percent of the viewport so longer words scale rather than producing an oversized window. Resizing no longer swaps the pad's minimum dimensions, and every single-stroke guide retains its order and direction annotation.

Annotation labels evaluate nearby placements around each stroke start and choose the first position that clears other labels and every rendered stroke path. This keeps numbered bubbles readable and close to their strokes without covering completed user work.

Successful attempts with no more than one mistake now increase card-specific recall difficulty by hiding one additional randomly selected stroke guide. Hidden strokes are represented by a question mark in the canvas corner and are still validated normally. The top-right guidance action reveals hidden strokes for the current attempt without clearing accepted input or reducing the card’s learned difficulty. Annotation placement prefers the first nearby collision-free position instead of maximizing empty distance, keeping labels closer to their stroke starts.

The hidden-guide question mark appears only when the learner reaches a stroke whose guide is hidden; it no longer warns early about hidden strokes later in the pattern.

Switching an open Drawing Practice window to a card with a different column count now reapplies the stage aspect ratio and synchronizes the canvas bitmap after layout. Multi-character patterns no longer stretch vertically while the floating window redraws.

Pressing Escape closes the active Drawing Practice window through the same animated and fully cleaned-up close path as its close controls.

The drawing surface now derives a centered, aspect-preserving viewport from its actual rendered width and height. Resizing the floating pad therefore letterboxes the logical stroke area when necessary instead of stretching character geometry, while pointer coordinates, guides, annotations, completed strokes, and live ink all use the same fitted viewport.

Multi-character pads now trim unused horizontal space around each character’s stroke bounds and keep a small, consistent gap. The window narrows to the compact pattern while preserving character proportions, stroke order, timing, pressure, and pointer alignment during resizing and card changes.

The initial pad height now follows the rendered canvas, heading, and controls instead of a fixed allowance capped at seventy percent of the viewport. Short viewports reduce the available canvas height while preserving stroke proportions and keeping the Reset control visible. Loading another card refits the content and keeps the pad inside the viewport.
