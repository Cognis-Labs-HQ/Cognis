# Device Layouts

**Feature Branch:** feature-core-device-layouts

## Responsive Workspaces

Narrow Calendar panels show an agenda containing every event and the selected date, with a compact view selector and date jump. Wide panels retain calendar grids. The date field reaches empty dates without scrolling through a month. Shared calendars use the same presentations and enforce read-only access.

Messages sizes its thread and composer from the visible viewport. The shared sidebar control opens conversations on phones and tablets; Escape restores focus, choosing a room closes the drawer, and orientation changes retain drafts. Short screens scroll a usable workspace instead of clipping controls.

## Composer

The page composer owns presentation selection. Every element renderer receives an immutable context with `compact`, `layout`, `drawer` and `touch`. Selection uses the card’s available inner width, including changes caused by sidebars or nested layouts. Declare `responsive: true` when an element needs different markup at a presentation boundary; ordinary stateful elements keep their DOM. Use `onResize(presentation)` for geometry updates. Page code does not need viewport queries or resize listeners.

Desktop toolbars use a bounded shared column so content retains useful space. The column respects the selected text size; phones and tablets use the Composer drawer.

The shared `layout` values are `compact` (up to 640px), `medium` (up to 900px), and `regular`, measured inside the card. Dense surfaces such as Calendar use the agenda in both constrained presentations.

Composer-owned `data-composer-layout`, `data-composer-drawer` and `data-composer-touch` styling hooks cover layout and input changes. Both standard and nested composition receive the same context. The composer observes content and cards, restores form state, and releases observers and listeners when the page ends.

## Page and Sidebar Navigation

Use the Pages grid in the main header to switch destinations. It opens a compact page switcher with keyboard focus containment and Escape dismissal. Page sidebars use the same double-chevron SVG control in the top left, supplied by Page Composer. Messages uses this control for conversations.

## Readable Mobile Content

Calendar keeps its controls above an independently scrolling agenda, with an accessible Add Event icon beside each date. Messages limits long room headings to two visible lines while retaining the complete accessible title. Profile shows identity, post composition and the post timeline before secondary social sections on phones and tablets; biographies and post text wrap naturally.

`stackAt: "medium"` requests a flowing single column through the shared tablet boundary. `readingOrder` declares the element order for that presentation without changing saved desktop layouts. Existing form nodes and drafts survive layout changes.

Study card previews use the shared reader surface. The dialog follows the available width, keeps heading and Previous/Next actions visible, and scrolls long content independently. Tablet and touch controls retain 44px targets; compact detail facts stack without squeezing their values.

The header and footer share one shell width, so their outer edges align on phones, tablets and desktop.

Preview shows the current title and body before publishing. Return to Compose or rotate the device without losing your draft.

Published posts appear immediately, and deletions update the timeline without reloading.

Elements can declare a stable `data-composer-header` host. Composer places its sidebar control there, retaining the same button and focus behavior across redraws. Keep asynchronously replaced content inside a child of that host. The `data-composer-sidebar-trigger` styling hook identifies the shared control. Calendar and Messages use this slot to leave more vertical space for content.

## Component Isolation

Calendar and Messages viewport fixtures live with their owning components. Browser fixtures explicitly supply component assets and fake external contracts, retaining checks for populated layouts, drafts, touch controls and cleanup. Messages tutorials target the public Composer sidebar hook.

Composer disables browser scroll anchoring throughout its grid content so width changes retain nested scroll offsets. Content owners control scrolling when they append or replace content.

## Compact Sidebars

Messages keeps New Room, conversations and Templates together, filling the available sidebar width. Empty and short lists no longer stretch to the drawer height; long room and template lists use Composer’s single scroll surface.

Shared sidebar insets adapt to available width, with one desktop gap and a rem-sized drawer that respects larger text. Feature controls can size themselves within the sidebar while retaining touch targets.

## Adaptive Study Navigation

Language names shorten to their language code and then their flag when the available space is tight. The full language name remains the accessible label and tooltip. Languages without a flag retain their code. More space restores the full names.

Sub-navigation links and buttons share the same underline thickness for resting, active, hover and keyboard-focus states. The shared shell owns this styling, including Leaderboard; Study only owns its language-label presentation.

## Commits

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
- [1ab4a71b2babcede98fe870eac78989dca014b38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ab4a71b2babcede98fe870eac78989dca014b38)
- [883db306dce10da3bf67b4fac29ca6c89f2ae5b9](https://github.com/Cognis-Labs-HQ/Cognis/commit/883db306dce10da3bf67b4fac29ca6c89f2ae5b9)
- [a0e4d976a436221c63c31eb622a55524de1b6bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0e4d976a436221c63c31eb622a55524de1b6bf0)
- [7127b6fa0650fb93631a2650e8014ceb8daffa6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7127b6fa0650fb93631a2650e8014ceb8daffa6c)
