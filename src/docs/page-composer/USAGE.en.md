# Usage

Practical procedures for Page Composer.

## Prerequisites

Each page supplies its content; the shared composer controls layout and sidebar presentation.

## Examples

A yellow preview marks the snapped destination reached when you drop a widget; it moves while the editor remains open. Orange marks an attempted minimum, maximum or grid-edge limit on the active resize axes. Done preserves the displayed positions and sizes, including unused space.

Drag an element left or right over another to exchange them without changing their sizes. Equal heights work even with different widths. Different heights also work when both new positions are clear, including the space above and below. A green line marks a valid leapfrog; the same line turns red when blocked, and releasing leaves the layout unchanged.

Resize cursors indicate whether an edge can grow, shrink or move in both directions. A handle remains available for shrinking when another element blocks expansion; handles disappear when no legal resize remains.

Open Edit Layout on a customizable page. Drag inside a widget to move it; holding near the top or bottom of the screen scrolls to off-screen rows. Drag a highlighted edge or corner to resize, including the left and top edges. The opposite edge stays in place. Minimize Elements when it covers your work, then expand it to choose Done or Discard. Add places a hidden element without dragging.

Reset Layout previews the default layout without saving. Press Done to save it, or Discard to restore the layout from before editing. Done and the layout shortcut report success or failure. A failed save keeps the staged layout available to retry or discard.

Resize to a phone width, open the sidebar, select a destination and return to the main content; repeat at tablet and desktop widths.

```js
import { createPageComposer } from "../../reuse/page-composer/init.js";

const composer = createPageComposer(document.querySelector("#app"), {
    allowCustomization: true,
    elements,
    preferenceKey: "my-page-layout",
    i18n,
    pageContext: { title: i18n.t("ui.page.title.settings") },
    onRender: () => bindPageEvents(),
    toolbar: [
        {
            id: "nav",
            label: i18n.t("ui.reuse.navigation"),
            render: () => renderNavHtml(),
        },
    ],
    floatingMenu: [
        {
            id: "save-bar",
            label: i18n.t("ui.reuse.save"),
            render: () => renderSaveBarHtml(),
        },
    ],
});

await composer.init();

document
    .querySelector("#app [data-some-toolbar-btn]")
    ?.addEventListener("click", handleToolbarClick);
```

Source: `src/ui/reuse/page-composer/init.js`

## Expected Results

Navigation remains reachable; growing workspaces fit the viewport while preserving their minimum reading area.

## Troubleshooting

Short screens may need page scrolling to preserve usable content. Report clipped controls with the page and viewport dimensions.
