# Usage

Practical procedures for Page Composer.

## Prerequisites

Each page supplies its content; the shared composer controls layout and sidebar presentation.

## Examples

Resize to a phone width, open the sidebar, select a destination and return to the main content; repeat at tablet and desktop widths.

```js
import { createPageComposer } from "../../reuse/page-composer/init.js";

const composer = createPageComposer(document.querySelector("#app"), {
    allowCustomization: true,
    elements,
    preferenceKey: "my-page-layout",
    i18n,
    pageContext: { title: "My Page", subtitle: "Subtitle text" },
    onRender: () => bindPageEvents(),
    toolbar: [
        { id: "nav", label: "Navigation", render: () => renderNavHtml() },
    ],
    floatingMenu: [
        {
            id: "save-bar",
            label: "Save bar",
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
