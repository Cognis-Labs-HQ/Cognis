# Reliable Module Navigation

**Feature Branch:** feature-review-pr-for-double-loading-issue

## Modules no longer remount during SPA navigation

The Modules page now uses the shared direct-page mount guard. Loading it through the dashboard router no longer triggers a second mount that duplicates navigation components and disrupts later SPA navigation.

## Page styles are isolated during navigation

The dashboard router now identifies route-owned styles from direct page loads and removes the previous page's styles before mounting the destination. Navigating from Meetings to Messages therefore cannot leave meeting-specific button rules behind to distort page-composer sidebars.

## Navigation controls render with their styles

Messages now loads each conversation stylesheet before mounting instead of relying on a chain of CSS imports, preventing conversation avatars from flashing at their unstyled size. The notification plugin also waits for its stylesheet before inserting the bell into the navigation bar.

## Commits

- [4506d46](https://github.com/Cognis-Labs-HQ/Cognis/commit/4506d46a613a8bb643d65a4ca5e6e0821c5f43fb)
- [63976d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/63976d1f112ff39eed1565d36fed8ae0500ad51b)
- [14c1e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/14c1e2fcb3904d92709a38a8cb13ca8fe7ed2a10)
- [e6fbb62](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6fbb62939f204ab29eec66842a1705ff26c7800)
- [77207d0](https://github.com/Cognis-Labs-HQ/Cognis/commit/77207d05b3bf404ecfccf24ed4a9a4c8a6319ffb)
- [5ccdca8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ccdca846f9696e63dbe7b0871c110d5fd7c5d51)
- [609c964](https://github.com/Cognis-Labs-HQ/Cognis/commit/609c9640c24cbbf5d66703fbe41832cf2c9ba962)
- [035ad2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/035ad2ad52ee11911478e758e9138d78dcd581a3)
