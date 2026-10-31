# Calendar Error Reporting

**Feature Branch:** test-calendar-error-reporting

## Single Calendar Actions

Calendar view listeners now belong to one render. Resizing or re-rendering replaces the previous listeners, so one date-add click opens one form. Navigation removes those listeners without removing unrelated handlers. Distinct runtime errors remain visible.

## Preserved Offline Calendar

Rebased on the current development branch without replacing the Calendar offline client, buffered writes, cached event details or reminder controls. Render scopes replace only view listeners; page-scoped event selection remains available after navigation.

## Commits

- [aa2959b21e70c585bf864c639f5319fdbb48f10a](https://github.com/Cognis-Labs-HQ/Cognis/commit/aa2959b21e70c585bf864c639f5319fdbb48f10a)
- [ee6db7013d3b8b614bef1766a8e05c0572ac4932](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee6db7013d3b8b614bef1766a8e05c0572ac4932)
- [3f6fb44800349314679b0fcd2bc827b9681a7bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f6fb44800349314679b0fcd2bc827b9681a7bd5)
- [c907d3dda0d8b07b8c9f0c6580ce4afb517315b2](https://github.com/Cognis-Labs-HQ/Cognis/commit/c907d3dda0d8b07b8c9f0c6580ce4afb517315b2)
- [9ee6d1d058d11f1a4dfd849183aebda17a804aa7](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ee6d1d058d11f1a4dfd849183aebda17a804aa7)
