# Device Layouts

**Feature Branch:** feature-core-device-layouts

## Responsive Workspaces

Narrow Calendar panels show an agenda containing every event and the selected date, with a compact view selector and date jump. Wide panels retain calendar grids. The date field reaches empty dates without scrolling through a month. Shared calendars use the same presentations and enforce read-only access.

Messages sizes its thread and composer from the visible viewport. Conversations opens the room drawer on phones and tablets; Escape restores focus, choosing a room closes the drawer, and orientation changes retain drafts. Short screens scroll a usable workspace instead of clipping controls.

## Composer

The page composer owns presentation selection. Every element renderer receives an immutable context with `compact`, `layout`, `drawer` and `touch`. Selection uses the card’s available inner width, including changes caused by sidebars or nested layouts. Declare `responsive: true` when an element needs different markup at a presentation boundary; ordinary stateful elements keep their DOM. Use `onResize(presentation)` for geometry updates. Page code does not need viewport queries or resize listeners.

Desktop toolbars use a bounded shared column so content retains useful space. The column respects the selected text size; phones and tablets use the Composer drawer.

The shared `layout` values are `compact` (up to 640px), `medium` (up to 900px), and `regular`, measured inside the card. Dense surfaces such as Calendar use the agenda in both constrained presentations.

Composer-owned `data-composer-layout`, `data-composer-drawer` and `data-composer-touch` styling hooks cover layout and input changes. Both standard and nested composition receive the same context. The composer observes content and cards, restores form state, and releases observers and listeners when the page ends.

## Commits

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
- [1ab4a71b2babcede98fe870eac78989dca014b38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ab4a71b2babcede98fe870eac78989dca014b38)
