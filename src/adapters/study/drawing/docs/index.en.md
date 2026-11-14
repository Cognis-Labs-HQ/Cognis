# Drawing Practice

Study owns the complete drawing pad in `src/gateways/study/ui/reuse/drawing.js`, including its canvas, controls, guidance, scoring and completion feedback. The optional Drawing adapter contributes the public `study:drawing:open` and `study:drawing:load` capabilities through browser `uiCtx`; callers await these actions and pass a complete Library card and validated `strokePattern`.

## Usage Examples

The same `openDrawingPad` engine accepts an optional `container`, abort `signal` and `onResult` callback. Without a container it opens a movable, resizable floating window within the page; loading a different card preserves its position. With a container it embeds the entire pad, locks the original character and reports success only when every ordered stroke is accepted. Flashcards requires no optional Drawing adapter for embedded Writing.

## Technical Specification

The pad accepts mouse, touch and pen input, checks stroke order, direction and proximity, and replaces accepted ink with canonical strokes. Before the first input, a pattern not yet completed by the current account shows full numbered guides. After input begins, only the next stroke is guided across all character boundaries. Previously completed patterns start with next-stroke guidance. The guidance button is disabled when all guides are visible.

Ten consecutive misses end an attempt. Completion displays the mistake count and retry control. A retry clears the attempt and respects learned guide difficulty. Completion and the number of hidden strokes persist per account and card. Successful attempts with at most one mistake increase the count, capped to the current pattern; each attempt, reset and retry samples fresh hidden positions. Direction arrows and annotation labels share the rendered canvas coordinates; labels avoid stroke paths and other labels. Rendering runs once per animation frame.

Ordered writing-unit references compose multi-character patterns without mutating provider content. Patterns trim unused space while preserving aspect ratio, timing, pressure, order and pointer alignment. Floating controls use the standard themed close SVG; embedded completion remains in its container without a separate close window. Component-owned styles preserve composer, shell, scroll container and side-menu behavior.

Open, load, stroke, reset, guidance, retry and close execute declared `study:drawing` action flows with before, execute and after stages. Route departure or parent abort releases pointer handlers, resize observers, pending rendering and the pad. Library and Flashcards call the public Study reuse contract rather than importing optional-adapter internals.

The shared drawing pad loads its owned HTML template once per browser module. Failed template requests reject the open action; leaving before loading completes aborts the mount. Provider-authored character groups remain intact in multi-character patterns.

## Conceal writing answers

The drawing heading initially shows a masked character and a standard click-to-reveal button. Loading a different character masks it again. Floating sessions expose their current card through the removable `study:drawing:observe` capability. The matching Library preview stays open, blurred and non-interactive until the pad changes character or closes; pronunciation and meaning remain available in the pad. Embedded Writing uses the same concealment and reports reveals as assisted attempts.

## Offline Study Assets

The provider prepares the drawing template, styles and close icons online, so a cached character can open the pad for the first time offline. Preparation, contributed actions, card observers and styles follow provider lifetime. Closing the pad removes its lifetime listener. No audio or dictionary data is fetched for this preparation.
