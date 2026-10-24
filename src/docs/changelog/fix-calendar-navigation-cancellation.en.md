# Cancel Old Calendar Loads

**Feature Branch:** fix-calendar-navigation-cancellation

## Cancel Old Calendar Loads

Leaving Calendar stops obsolete startup work before it updates the page or URL. The route signal reaches the page composer, and delayed calendar, event and invitation responses cannot rebuild a destination that has already been replaced. Cancelled startup does not show a late load-failure toast or restart the availability timer.

## Commits

- [6ec3ce5](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ec3ce546e9670f350d0fd86f2e5a05d2bf9b8f4)
