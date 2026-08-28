# Calendar All-Day ICS

**Feature Branch:** feature-fix-all-day-events-display-format

## True all-day exports

Calendar feeds now export all-day events with ICS date values even when the browser saved a local-midnight range with a UTC offset, so calendar clients display them as all-day events instead of timed 00:00-24:00 blocks.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a0f2dd5c85307e0ccd39fa03cd3e53c31a610ece
