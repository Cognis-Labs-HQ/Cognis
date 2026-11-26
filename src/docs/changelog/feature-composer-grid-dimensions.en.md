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

## Commits

- [42d72de](https://github.com/Cognis-Labs-HQ/Cognis/commit/42d72de61ab7765abe866b3fd3a0214bcfb2b006)
- [e025238](https://github.com/Cognis-Labs-HQ/Cognis/commit/e025238e3c4bab7a938cd2b6de30728c6495e30b)
- [6756c5f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6756c5fadd4cd220aa045a063cb9c5fd0237269a)
- [cb2952d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cb2952d3be976a2bdb224022153b5f34aec0c434)
