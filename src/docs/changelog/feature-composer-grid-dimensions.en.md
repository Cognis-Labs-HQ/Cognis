# Composer Grid Dimensions

**Feature Branch:** feature-composer-grid-dimensions

## Consistent Full Width

Full-width array declarations now use every available column in main and nested composers, including the login and registration form layouts. Numeric height limits and fill-height behavior remain independent.

## Drag Beyond the Grid

Dragging a widget below the current grid expands the content, overlay and shaded drop target together. The new extent remains available until the widget is dropped.

## Accurate Previews and Room for Controls

Drag previews and resize handles now use the same gap-aware dimensions as rendered cards, including half-grid placements. Editor measurements account for content padding and scrollbar space. The Elements panel uses available width so its action labels remain readable on desktop, tablet and mobile screens. Panel positioning measures width after applying the height limit, including any internal scrollbar.

## Stable Touch Layout Editing

Widgets retain the point where they were grabbed instead of jumping under the pointer. Main and nested editors support edge scrolling, pointer cancellation and touch resize targets. The Elements panel sizes to its content and minimizes to its header to free editing space. Saving keeps the editor active until persistence succeeds, including during viewport changes.

## Accurate Resize Controls

Element removal now uses the shared cancel-button appearance. Resize handles check size limits, grid boundaries and neighbouring tiles. They remain available for legal shrinking when expansion is blocked, with directional cursors showing the available moves. Attempts to expand into another tile show an unavailable cursor.

## Resize from Every Edge and Confirm Saves

Widgets can now resize from all eight edges and corners in main and nested editors. Left and top resizing retain the opposite edge, respect size and collision limits, and keep touch previews aligned with the grabbed point. Done, the layout shortcut and Reset show localized success or failure notifications through one shared save flow. Failed writes preserve pending edits for retry; repeated saves share a request and page cancellation prevents late feedback. Save failures use concise localized notices.

## Editor Helper Contracts

Reusable editor modules document their public exports, call examples, input/output contracts and cleanup responsibilities. The Technical reference covers save results, editor state and the actual per-column persistence payload in all four supported languages.

## Comfortable Workspace Defaults

Dashboard branding has room for its icon and full title, welcome and login cards retain readable widths, and account details use a compact default height. Composer applies current minimum and maximum widths when a saved row requires repacking, keeping visible cards within their bounds without overwriting stored profiles. Normalized placements are validated before rendering, so a widened saved card at the right edge is repacked within the declared grid.

## Collision-Safe Widget Exchanges

Main and nested editors validate both full destination rectangles before exchanging widgets, including unequal sizes, other visible elements and grid boundaries. Mouse, touch and keyboard moves share the same checks; release revalidates the live layout before changing either position. Nested edge scrolling retains provisional grid height and remeasures previews after growth changes ancestor scrolling.

## Commits

- [42d72de](https://github.com/Cognis-Labs-HQ/Cognis/commit/42d72de61ab7765abe866b3fd3a0214bcfb2b006)
- [e025238](https://github.com/Cognis-Labs-HQ/Cognis/commit/e025238e3c4bab7a938cd2b6de30728c6495e30b)
- [6756c5f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6756c5fadd4cd220aa045a063cb9c5fd0237269a)
- [cb2952d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cb2952d3be976a2bdb224022153b5f34aec0c434)
- [fcc204f](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcc204fe09b8fa86814d5f24b5d3839dfbc51c2b)
- [286d397](https://github.com/Cognis-Labs-HQ/Cognis/commit/286d397650ef4e285375d95201a7eee6c70b6528)
- [f038150](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03815014aee59973f68dc3f040c2bf248309f9e)
- [fc698c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc698c84645f30eabbc25306ecf3eccbbb3b8828)
- [ba219ba](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba219ba88b792c7535934b4dd5e78e93ba601777)
- [935c670](https://github.com/Cognis-Labs-HQ/Cognis/commit/935c670f7a9447e83355662c8facfbfd090255fa)
