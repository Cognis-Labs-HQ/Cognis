# Drawing Practice

Study owns the complete drawing pad in `src/gateways/study/ui/reuse/drawing.js`, including its canvas, controls, guidance, scoring and completion feedback. The optional Drawing adapter contributes the public `study:drawing:open` and `study:drawing:load` capabilities through browser `uiCtx`; callers await these actions and pass a complete Library card and validated `strokePattern`.

## Usage Examples

The same `openDrawingPad` engine accepts an optional `container`, abort `signal` and `onResult` callback. Without a container it opens a movable, resizable floating window within the page; loading a different card preserves its position. With a container it embeds the entire pad, locks the original character and reports success only when every ordered stroke is accepted. Flashcards requires no optional Drawing adapter for embedded Writing.

## Technical Specification

The pad accepts mouse, touch and pen input, checks stroke order, direction and proximity, and replaces accepted ink with canonical strokes. An attempt begins with full numbered guides. Progressive guidance retains accepted strokes, shows the next stroke and respects per-character boundaries in composite patterns. The guidance button is disabled when all guides are visible.

Ten consecutive misses end an attempt. Completion displays the mistake count and retry control. A retry clears the attempt and respects learned guide difficulty. Successful attempts with at most one mistake increase in-memory character difficulty. Direction arrows and annotation labels share the rendered canvas coordinates; labels avoid stroke paths and other labels. Rendering runs once per animation frame.

Ordered writing-unit references compose multi-character patterns without mutating provider content. Patterns trim unused space while preserving aspect ratio, timing, pressure, order and pointer alignment. Floating controls use the standard themed close SVG; embedded completion remains in its container without a separate close window. Component-owned styles preserve composer, shell, scroll container and side-menu behavior.

Open, load, stroke, reset, guidance, retry and close execute declared `study:drawing` action flows with before, execute and after stages. Route departure or parent abort releases pointer handlers, resize observers, pending rendering and the pad. Library and Flashcards call the public Study reuse contract rather than importing optional-adapter internals.

The shared drawing pad loads its owned HTML template once per browser module. Failed template requests reject the open action; leaving before loading completes aborts the mount. Provider-authored character groups remain intact in multi-character patterns.
