# Technical Reference

Page Composer manages element layout, responsive presentation, owned DOM lifetime and optional layout/draft persistence.

## Interfaces

createPageComposer(root, options) creates the page lifecycle. Elements supply content and owned render callbacks; init mounts the shared shell and refresh updates descriptors while preserving registered lifetimes.

## Configuration

createPageComposer accepts elements, pageManifest, i18n, signal and layout options. Viewport-filling elements opt in to the documented responsive layout contract; persisted layout preferences use the page preferenceKey.

## Behavior

### Overview

`createPageComposer` is the layout orchestration utility used by all Cognis pages. Individual page modules declare _what_ to render — a list of named content blocks called elements — and the composer handles how those blocks are arranged, persisted, navigated, and re-rendered. This separation means that adding a new widget to a page does not require writing any grid, drag-and-drop, or persistence code.

Pages that enable customisation present their elements in a free-form resizable and draggable grid. Users can move and resize widgets; their arrangement is saved to the preferences API and restored on next visit. Pages that disable customisation render elements in a fixed order using the same element declaration format, so the calling code is identical either way.

The composer also handles sub-page navigation (one element visible at a time, deep-linkable via URL hash), nested sub-composers for complex sections, persistent toolbar slots, and floating menu overlays. All of these are opt-in through the options object passed to `createPageComposer`.

### Responsibilities

- Render a set of named elements into a parent DOM node.
- Manage a free-form 90 px grid when `allowCustomization: true`.
- Persist and restore element placement and visibility via the preferences API.
- Drive sub-page navigation when `subPageNavigation: true`.
- Mount nested sub-composers for elements with `subComposerOptions`.
- Provide persistent toolbar and floating menu slots.
- Call `onRender` after every content render so pages can bind events.
- Expose `refresh(elements)` for in-place element definition swaps.

Not responsible for: fetching data, managing authentication, or rendering application chrome outside the composer's parent node.

### Elements

An element is a named content block declared as a plain object:

```js
{
  id: 'my-widget',
  label: i18n.t('ui.reuse.settings'),
  render: () => renderSettingsContent(),
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

Array declarations support `['full', 'fill']` for full width and filling the available height, or `['full', n]` for full width with a numeric height limit. Both main and nested composers honor these dimensions on narrow and wide grids. While dragging below the grid, the editor grows its content bounds and visible grid together before the widget is dropped.

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

DOM parking is disabled by default. Set `enableDomParking: true` on the page composer only when media DOM must survive composer re-renders. When enabled, cards containing iframes or other media are parked and restored as intact DOM; this is intended for stateful embeds such as Jitsi Meet. Ordinary pages should rely on fresh rendering and transient form-state restoration so updated content is not hidden by a stale parked tree. `refresh(elements)` updates element definitions and placement while retaining existing card DOM. Use `refreshElements(ids)` to regenerate changed content through Composer; layout-only updates retain controls and drafts.

### Persistence

Layouts are stored via `PUT /api/v1/social/users/:accountId/preferences/:preferenceKey` under the key supplied as `preferenceKey`. The stored value is `{ placements: [{id, col, row, w, h}], hidden: [] }`.

Form drafts are also persisted in `localStorage` per user, page path, and composer preference key. This keeps typed inputs when the page reloads or when a responsive re-render rebuilds the element cards. Persistent form draft storage is opt-in: only fields whose closest ancestor carries `data-composer-include-form-memory="true"` are written to localStorage. Fields without an opted-in ancestor are still captured in the transient in-memory snapshot so they survive responsive re-renders within the same session, but they are never written to persistent storage. Sensitive fields (`password`, `file`, `hidden`, and identifiers containing `password`/`secret`/`token`) are always excluded from persistent draft storage regardless of opt-in status.

Cards with larger forms (6 or more persistable fields) include a **Reset Draft** button. This button clears the persisted draft for that card and resets the current fields to their default values.

### Theme-aware pointer controls

The shared pointer-style button uses the standard theme foreground (`--text`) for mouse, laser and crosshair icons, including in embedded component pages. Participant pointer colours remain unchanged.

### Responsive Layout

Page Composer uses the available content width, not device names. At 640 CSS pixels or less, ordinary cards form a full-width reading column with content-sized rows; the desktop arrangement remains intact. Embedded frameless surfaces retain their own sizing. Wider panes preserve the grid and per-column saved profiles.

The layout editor remains available on phones and tablets. Touch resize handles and remove controls stay visible. Use Add in the elements panel without dragging; focus a widget and use arrow keys to move it or Shift plus arrow keys to resize. Cancelling a pointer gesture does not commit it. Nested editors use the full container width, and resizing a nested view retains its existing form controls.

Below 900 CSS pixels, the toolbar opens as a drawer. Filters and other in-place buttons remain usable while it is open; navigation closes it. Escape or the backdrop dismisses the drawer and restores focus. Navigation, toolbar, search and popup surfaces share scroll locking so nested overlays do not leave the page locked or scrolling behind a dialog.

The workspace tutorial highlights the visible navigation toggle on narrow screens and explains touch and keyboard layout controls. Browser regression scenarios cover 320, 390, 768, 1024 and 1440 CSS pixels, rotation, keyboard input and repeated mounts. Run `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/responsive-browser.test.js` on a machine where Chromium can launch. Browser emulation does not establish iOS Safari, installed PWA or real-device keyboard behavior.

On phones, branding and the page title share the first header row; navigation and account controls occupy the second. The subtitle remains available to assistive technology, and the smallest screens show the brand icon to leave room for long titles. Closed toolbar controls scroll beneath the sticky header. Floating action menus use compact spacing while retaining 44-pixel touch targets. Tutorial controls have an opaque background and a clearly outlined target; short screens allow the explanation to use header space while preserving the footer boundary. Mobile text follows the selected font and size rather than shrinking the whole page.

Run the shared shell and tutorial checks with `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/*.test.js`. To check built-in pages through direct and SPA navigation, provide an isolated running instance through `COGNIS_CORE_BROWSER_URL` and a JSON credentials file (`username`, `password`, `provider`) through `COGNIS_BROWSER_CREDENTIALS`, then run `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/integration/core-pages-browser.test.js`. This suite expects a dedicated admin account and enabled built-in gateways; it excludes external module pages.

### Responsive Workspaces

The page composer owns presentation selection. Every element renderer receives an immutable context with `compact`, `layout`, `drawer` and `touch`. Selection uses the card’s available inner width, including changes caused by sidebars or nested layouts. Declare `responsive: true` when an element needs different markup at a presentation boundary; ordinary stateful elements keep their DOM. Use `onResize(presentation)` for geometry updates. Page code does not need viewport queries or resize listeners.

Desktop toolbars use a bounded shared column so content retains useful space. The column respects the selected text size; phones and tablets use the Composer drawer.

The shared `layout` values are `compact` (up to 640px), `medium` (up to 900px), and `regular`, measured inside the card. Dense surfaces such as Calendar use the agenda in both constrained presentations.

Composer-owned `data-composer-layout`, `data-composer-drawer` and `data-composer-touch` styling hooks cover layout and input changes. Both standard and nested composition receive the same context. The composer observes content and cards, restores form state, and releases observers and listeners when the page ends.

Layout updates notify `onResize`; `onRender` attaches behavior to generated content. Layout-only changes retain the bindings of unchanged controls. Explicit content refreshes mount the requested elements once.

For live viewport checks against an isolated instance, set `COGNIS_BROWSER_TESTS=1`, `COGNIS_CORE_BROWSER_URL` and `COGNIS_BROWSER_CREDENTIALS`. The optional `COGNIS_BROWSER_BYPASS_SERVICE_WORKER=1` isolates rendering from the service-worker cache; offline and PWA behavior require separate checks.

### Page and Sidebar Navigation

Use the Pages grid in the main header to switch destinations. It opens a compact page switcher with keyboard focus containment and Escape dismissal. Page sidebars use the same double-chevron SVG control in the top left, supplied by Page Composer. Messages uses this control for conversations.

`stackAt: "medium"` requests a flowing single column through the shared tablet boundary. `readingOrder` declares the element order for that presentation without changing saved desktop layouts. Existing form nodes and drafts survive layout changes.

Single fixed pages use `fillViewport: true`. Mark their primary reading area with `data-composer-viewport-body`; Composer reserves 20rem for that area and measures the surrounding padding and controls separately. It fits the remaining viewport when space permits and lets the page scroll when the minimum cannot fit. Resizing controls, replacing content and enlarging text recalculate the minimum. Scrolling the document does not increase the fitted height. Composer owns the sidebar button; `openToolbar(trigger)` and `closeToolbar()` remain available for deliberate actions.

Use `contentScrolling: false` for ordinary documents that grow with their content. Calendar and Messages use viewport fitting with internal reading-area scrolling.

Shared popups accept `surface: "reader"` for reading content. This surface consumes Composer presentation hooks, keeps its header and footer outside the scrolling body, and releases presentation observers when dismissed.

The header and footer share one shell width, so their outer edges align on phones, tablets and desktop.

Elements can declare a stable `data-composer-header` host. Composer places its sidebar control there, retaining the same button and focus behavior across redraws. Keep asynchronously replaced content inside a child of that host. The `data-composer-sidebar-trigger` styling hook identifies the shared control. Calendar and Messages use this slot to leave more vertical space for content.

Composer disables browser scroll anchoring throughout its grid content so width changes retain nested scroll offsets. Content owners control scrolling when they append or replace content.

Shared sidebar insets adapt to available width, with one desktop gap and a rem-sized drawer that respects larger text. Feature controls can size themselves within the sidebar while retaining touch targets.

Shared side-menu entries use selected-row and keyboard-focus indicators. Sidebar spacing and scrolling belong to Composer rather than individual pages.

Toolbar menu buttons retain their own transparent resting surfaces and themed hover, selection and keyboard focus. Form fields keep their field styling; action buttons keep their semantic colors. Light surfaces use a text-tinted hover layer.

### Composer Panel Appearance

Composer uses the Messages panel surface for both the sidebar and main content. Each toolbar contribution is wrapped in a protected `composer-sidebar-section`; its outer content stays transparent and uses Composer spacing. Main cards do not add opaque backgrounds or shadows over the panel. Native menu rows share text, hover, selection and focus styling; explicit confirmation, cancel and neutral controls retain their semantic styles. Frameless and borderless embeds retain transparent surfaces. Page styles must not override protected panel classes or assign the shared `--toolbar-bg` token. The `composerSurfaces` cascade layer is reserved for the host.

Composer owns the content-section inset: 28px on wider screens and 14px at 640px or below, including viewport-filling pages. Frameless and borderless embeds remain flush. Sidebar list wrappers stay transparent and unpadded so menu entries do not acquire extra card surfaces. Page styles cannot assign `--composer-grid-inset` or override host padding.

### Font Loading

Shared text wraps within the available width before and after a font loads, without reducing the selected font size.

## Security

Composer controls presentation and owned DOM lifetime, not resource authorization. Page actions still require their owner's flows; markup and stylesheet contributions must respect the shared panel and menu boundaries.

## Reference

- [src/ui/reuse/page-composer/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/index.js)
