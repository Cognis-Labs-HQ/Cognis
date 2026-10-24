# Faster Calendar Startup

**Feature Branch:** perf-calendar-startup-reads

## Faster Calendar Startup

Calendar starts invitation discovery alongside the calendar-list request and loads events as soon as that list is ready. Page construction still waits for the required reads. Invitation failures keep the existing empty-invitation behavior, and every navigation requests fresh data. Cancellation checks prevent delayed results from constructing an obsolete page.

## Commits

- [8558990](https://github.com/Cognis-Labs-HQ/Cognis/commit/85589901ffa36dbc5f0efc3671cc13b67fe35bb3)
