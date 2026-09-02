# Reliable Connection Recovery

**Feature Branch:** work

## Confirm Connection Interruptions

Connection warnings now require a failed same-origin health check, preventing unrelated API responses and failures from producing a false interruption state. Recovery state is isolated by Cognis origin so separate installations cannot affect one another.

## Refresh After Recovery

Cognis now checks for restored service after a confirmed interruption, replaces the warning with an informational recovery toast, and refreshes the page when that toast disappears.

## Commits

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)
