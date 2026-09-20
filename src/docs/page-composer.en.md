# Page Composer

## Overview

`createPageComposer` is the layout orchestration utility used by all Cognis pages. Individual page modules declare _what_ to render — a list of named content blocks called elements — and the composer handles how those blocks are arranged, persisted, navigated, and re-rendered. This separation means that adding a new widget to a page does not require writing any grid, drag-and-drop, or persistence code.

Pages that enable customisation present their elements in a free-form resizable and draggable grid. Users can move and resize widgets; their arrangement is saved to the preferences API and restored on next visit. Pages that disable customisation render elements in a fixed order using the same element declaration format, so the calling code is identical either way.

The composer also handles sub-page navigation (one element visible at a time, deep-linkable via URL hash), nested sub-composers for complex sections, persistent toolbar slots, and floating menu overlays. All of these are opt-in through the options object passed to `createPageComposer`.

## Responsibilities

- Render a set of named elements into a parent DOM node.
- Manage a free-form 90 px grid when `allowCustomization: true`.
- Persist and restore element placement and visibility via the preferences API.
- Drive sub-page navigation when `subPageNavigation: true`.
- Mount nested sub-composers for elements with `subComposerOptions`.
- Provide persistent toolbar and floating menu slots.
- Call `onRender` after every content render so pages can bind events.
- Expose `refresh(elements)` for in-place element definition swaps.

Not responsible for: fetching data, managing authentication, or rendering application chrome outside the composer's parent node.

## Architecture

### Elements

An element is a named content block declared as a plain object:

```js
{
  id: 'my-widget',
  label: 'My Widget',
  render: () => '<h2>Content</h2>',
  gridSize: { default: [4, 3], min: [2, 2] },
  pinned: false,
}
```

| Field                | Required | Description                                                                                                               |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | Yes      | Unique string identifier; also used as the DOM `id`                                                                       |
| `label`              | Yes      | Human-readable label shown in the editing panel                                                                           |
| `render`             | Yes      | Function returning an HTML string for the element's content                                                               |
| `gridSize`           | No       | `{ default: [w,h], min: [w,h], max?: [w,h] \| 'full' \| 'half' \| ['half'\|number, 'half'\|number] }` in 90 px grid units |
| `pinned`             | No       | When `true`, the element cannot be removed by the user                                                                    |
| `subComposerOptions` | No       | Mounts a nested composer inside this element                                                                              |

### Grid layout

Grid units are 90 px wide and tall. `gridSize.max: 'full'` spans the element across all available columns. `gridSize.max: 'half'` spans the element across half the available columns. Mixed forms like `['half', n]` (half-width, numeric max height) are also supported.

In edit mode, hover effects, overflow scrolling, and animations inside each element are suppressed so the full cell surface is draggable. Dragging an element onto an occupied cell swaps the two elements when geometrically feasible; a coloured axis line highlights where the swap will occur before the pointer is released.

### Sub-page navigation

When `subPageNavigation: true`, only one element is visible at a time. Toolbar buttons with `[data-composer-scroll]` act as section selectors. The active section is stored in the URL hash for deep-links.

### Sub-composers

Setting `subComposerOptions` on an element mounts a nested composer inside that element's section:

```js
{
  id: 'appearance',
  subComposerOptions: {
    heading: 'Appearance',
    elements: [...],
    onRender: () => bindAppearanceControls(),
    columns: 2,
  },
}
```

Pass `columns: 2` to render the sub-composer grid with two equal-width columns.

### Toolbar

The `toolbar` array declares panels in the page header. Each item provides a `render()` function injected once during `init()`. Toolbar DOM is persistent — attach event listeners after `await composer.init()`, not in `onRender`.

### Floating menu

The `floatingMenu` array renders entries inside a `.floating-toolbar` overlay. Each entry is wrapped in a named DOM slot (`data-floating-slot`). Access a slot via `composer.getFloatingSlot(id)` — never query `.floating-toolbar` directly.

```js
const slot = composer.getFloatingSlot("save-bar");
slot.hidden = false;
```

### `onRender` callback

`onRender` is called after every content render, including the initial render during `init()` and subsequent re-renders driven by `ResizeObserver`. Use it to bind events to content elements that are recreated on each render. Do not attach listeners to toolbar or floating-menu DOM in `onRender` — those nodes are persistent and must be wired once after `init()`.

### DOM parking

DOM parking is disabled by default. Set `enableDomParking: true` on the page composer only when media DOM must survive composer re-renders. When enabled, cards containing iframes or other media are parked and restored as intact DOM; this is intended for stateful embeds such as Jitsi Meet. Ordinary pages should rely on fresh rendering and transient form-state restoration so updated content is not hidden by a stale parked tree. Each `refresh()` call re-renders every existing visible card by default, so state changes are reflected without page-specific DOM replacement code.

### Persistence

Layouts are stored via `PUT /api/v1/users/:username/preferences` under the key supplied as `preferenceKey`. The stored value is `{ placements: [{id, col, row, w, h}], hidden: [] }`.

Form drafts are also persisted in `localStorage` per user, page path, and composer preference key. This keeps typed inputs when the page reloads or when a responsive re-render rebuilds the element cards. Persistent form draft storage is opt-in: only fields whose closest ancestor carries `data-composer-include-form-memory="true"` are written to localStorage. Fields without an opted-in ancestor are still captured in the transient in-memory snapshot so they survive responsive re-renders within the same session, but they are never written to persistent storage. Sensitive fields (`password`, `file`, `hidden`, and identifiers containing `password`/`secret`/`token`) are always excluded from persistent draft storage regardless of opt-in status.

Cards with larger forms (6 or more persistable fields) include a **Reset Draft** button. This button clears the persisted draft for that card and resets the current fields to their default values.

### Usage example

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
