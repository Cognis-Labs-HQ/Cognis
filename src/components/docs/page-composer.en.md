# Page Composer

## Overview

`createPageComposer` is the layout orchestration utility for all Cognis pages. It manages widget placement, persistence, editing, sub-page navigation, toolbar slots, and floating menus — so individual page modules only declare _what_ to render, not _how_ to arrange it.

## Core concepts

### Elements

An element is a named content block. Each page declares its elements as an array:

```js
const elements = [
    {
        id: "modules-list",
        label: "Modules",
        render: () => "<h2>Modules</h2>...",
        gridSize: { default: [4, 3], min: [2, 2] },
    },
];
```

| Field                | Required | Description                                                                                                                |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | Yes      | Unique string identifier. Also used as DOM `id`.                                                                           |
| `label`              | Yes      | Human-readable label shown in the editing panel.                                                                           |
| `render`             | Yes      | Function returning HTML string for the element's content.                                                                  |
| `gridSize`           | No       | `{ default: [w,h], min: [w,h], max?: [w,h] \| 'full' \| 'half' \| ['half'\|number, 'half'\|number] }` in 90 px grid units. |
| `pinned`             | No       | When `true`, the element cannot be removed by the user.                                                                    |
| `subComposerOptions` | No       | Enables a nested sub-composer for this element (see below).                                                                |

### Grid layout (free-form mode)

When `allowCustomization: true`, elements are rendered in a resizable, draggable grid. Users can move and resize widgets; their arrangement is saved to the user-preferences API under `preferenceKey`.

Grid units are 90 px wide and tall. `gridSize.max: 'full'` spans the element across all available columns. `gridSize.max: 'half'` spans the element across half the available columns. To apply half on both axes (a quadrant element), use `gridSize.max: ['half', 'half']`. Mixed forms such as `['half', n]` (half-width, numeric max height) or `[n, 'half']` (numeric max width, half-height) are also supported.

In edit mode, hover effects, overflow scrolling, and animations inside each element are suppressed so the full cell surface is draggable. Dragging an element onto an occupied cell swaps the two elements when the swap is geometrically feasible; a coloured axis line highlights where the leapfrog will occur before the pointer is released.

### Sub-page navigation

When `subPageNavigation: true`, only one element is visible at a time. Toolbar buttons marked with `[data-composer-scroll]` act as section selectors. The active section is stored in the URL hash so deep-links work.

### Sub-composers

Setting `subComposerOptions` on an element mounts a nested composer inside that element's section. Sub-composers have their own `elements`, `onRender`, and optional `heading` and `columns` settings.

```js
{
  id: 'appearance',
  subComposerOptions: {
    heading: 'Appearance',
    elements: [...],
    onRender: () => bindAppearanceControls(),
  },
}
```

### Toolbar

The `toolbar` array declares panels that appear in the page header. Each item provides a `render()` function whose HTML is injected once during `init()`. Because the toolbar DOM is persistent, any event listeners should be attached after `await composer.init()` rather than in `onRender`.

### Floating menu

The `floatingMenu` array works like the toolbar but renders inside a `.floating-toolbar` overlay. Each entry is wrapped in a named DOM slot (`data-floating-slot`). The overlay is automatically shown when at least one slot is visible and hidden when all slots are hidden.

Access a slot from page code via `composer.getFloatingSlot(id)` — never query `.floating-toolbar` directly.

```js
const slot = composer.getFloatingSlot("save-bar");
slot.hidden = false;
```

### `onRender` callback

`onRender` is called after every content render — including the initial render during `init()` and subsequent re-renders driven by `ResizeObserver`. Use it to bind events to content elements that are recreated on each render.

**Do not** attach listeners to toolbar or floating-menu DOM in `onRender` — those nodes are persistent and should be wired once after `init()` (see the usage example below).

### `refresh(elements)`

Call `composer.refresh(newElements)` to swap in a new set of element definitions and re-render without a full page reload.

## Usage

```js
import { createPageComposer } from "../../reuse/page-composer.js";

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

// Bind toolbar events once — toolbar DOM is not recreated on resize.
document
    .querySelector("#app [data-some-toolbar-btn]")
    ?.addEventListener("click", handleToolbarClick);
```

## Two-column layout

Pass `columns: 2` in `subComposerOptions` to render the sub-composer grid with two equal-width columns (CSS class `content-grid--two-column`). This is used by the Language preferences page to show tables side-by-side.

## Persistence

Layouts are stored via `PUT /api/v1/users/:username/preferences` under the key supplied as `preferenceKey`. Each page retains its own arrangement independently. The stored value is `{ placements: [{id, col, row, w, h}], hidden: [] }`.
