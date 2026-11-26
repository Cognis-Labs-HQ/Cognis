# Composer Grid Dimensions

**Feature Branch:** feature-composer-grid-dimensions

## Consistent Full Width

Full-width array declarations now use every available column in main and nested composers, including the login and registration form layouts. Numeric height limits and fill-height behavior remain independent.

## Drag Beyond the Grid

Dragging a widget below the current grid expands the content, overlay and shaded drop target together. The new extent remains available until the widget is dropped.

## Accurate Previews and Room for Controls

Drag previews and resize handles now use the same gap-aware dimensions as rendered cards, including half-grid placements. Editor measurements account for content padding and scrollbar space. The Elements panel uses available width so its action labels remain readable on desktop, tablet and mobile screens.

## Stable Touch Layout Editing

Widgets retain the point where they were grabbed instead of jumping under the pointer. Main and nested editors support edge scrolling, pointer cancellation and touch resize targets. The Elements panel sizes to its content and minimizes to its header to free editing space. Saving keeps the editor active until persistence succeeds, including during viewport changes.

## Accurate Resize Controls

Element removal now uses the shared cancel-button appearance. Resize handles check size limits, grid boundaries and neighbouring tiles. They remain available for legal shrinking when expansion is blocked, with directional cursors showing the available moves. Attempts to expand into another tile show an unavailable cursor.

## Resize from Every Edge and Confirm Saves

Widgets can now resize from all eight edges and corners in main and nested editors. Left and top resizing retain the opposite edge, respect size and collision limits, and keep touch previews aligned with the grabbed point. Done, the layout shortcut and Reset show localized success or failure notifications through one shared save flow. Failed writes preserve pending edits for retry; repeated saves share a request and page cancellation prevents late feedback.

## Commits

- [42d72de](https://github.com/Cognis-Labs-HQ/Cognis/commit/42d72de61ab7765abe866b3fd3a0214bcfb2b006)
- [e025238](https://github.com/Cognis-Labs-HQ/Cognis/commit/e025238e3c4bab7a938cd2b6de30728c6495e30b)
- [6756c5f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6756c5fadd4cd220aa045a063cb9c5fd0237269a)
- [cb2952d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cb2952d3be976a2bdb224022153b5f34aec0c434)
- [fcc204f](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcc204fe09b8fa86814d5f24b5d3839dfbc51c2b)
- [286d397](https://github.com/Cognis-Labs-HQ/Cognis/commit/286d397650ef4e285375d95201a7eee6c70b6528)
