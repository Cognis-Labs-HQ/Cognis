# Filter New Room search to users

**Feature Branch:** work

## User-only room discovery

The Messages New Room picker now passes the shared search utility’s user category and type filter, matching the filtered-search parameters used by Jitsi Meet and excluding unrelated result types.

## Responsive search status

Search now replaces the minimum-length prompt with a loading state as soon as an eligible query runs. Failed and timed-out requests render an explicit error instead of leaving stale results or an unresponsive prompt.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
