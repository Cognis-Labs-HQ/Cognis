# Clearer Navigation Controls

**Feature Branch:** feature-replace-search-icon-with-svg-and-update-dropdown-menu

## Theme-aware search icon

The global search control now uses a larger, crisp SVG icon with dedicated light and dark theme variants.

## Active account menu control

The account avatar button displays its active state while the user dropdown menu is open, and the menu persistently highlights the link for the current page.

## Complete changelog guidance

The contributor and AI instructions now explicitly require localized feature-branch metadata and a final commit-link section, matching the repository's enforced changelog format.

## Reliable module operations

The Modules catalog refresh now shows the standard spinning progress wheel, prevents overlapping refreshes, and restores the refresh icon when complete. Module lifecycle actions are queued so rapidly starting operations on different modules complete in order instead of interrupting one another.

## Precise persistent navigation states

The user menu now underlines only the most specific current-page link, so Modules no longer also marks Administration as current. The active underline overrides the dashboard control reset for both links and buttons. The search icon stylesheet is retained by the dashboard shell and remains visible after SPA navigation.

## Commits

- [76d78c2](https://github.com/Cognis-Labs-HQ/Cognis/commit/76d78c25eccda985bf18c81e4c8c05e807d44c38)
- [c3a06c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3a06c8624046512362c1a8341bd4639305506c0)
- [18c3f6b](https://github.com/Cognis-Labs-HQ/Cognis/commit/18c3f6b5bec6c9885a098c610fa67eeba946addc)
- [fb6b6db](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb6b6db813aa143f4d7998657d0a98b25fc063f9)
- [09d7628](https://github.com/Cognis-Labs-HQ/Cognis/commit/09d7628cd763f70ddf69b5d3ad472c52eafeb828)
- [73748b2](https://github.com/Cognis-Labs-HQ/Cognis/commit/73748b2353bf3edce96e39d31cdf2acde753f264)
