# Usage

Practical procedures for Page Composer.

## Prerequisites

Each page supplies its content; the shared composer controls layout and sidebar presentation.

## Examples

Resize cursors indicate whether an edge can grow, shrink or move in both directions. A handle remains available for shrinking when another element blocks expansion; handles disappear when no legal resize remains.

Open Edit Layout on a customizable page. Grab any part of a widget and drag it; holding near the top or bottom edge scrolls to off-screen rows. On a phone, use the visible corner handle to resize. Minimize Elements when it covers your work, then expand it to choose Done or Discard. Add places a hidden element without dragging.

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
