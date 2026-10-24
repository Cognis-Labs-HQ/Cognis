# Calendar Error Reporting

**Feature Branch:** test-calendar-error-reporting

## Single Calendar Actions

Calendar view listeners now belong to one render. Resizing or re-rendering replaces the previous listeners, so one date-add click opens one form. Navigation removes those listeners without removing unrelated handlers. Distinct runtime errors remain visible.

## Commits

- [a74092b4ad19133fa63b19ae25d95281e76bb3ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/a74092b4ad19133fa63b19ae25d95281e76bb3ed)
