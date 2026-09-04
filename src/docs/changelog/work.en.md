# Filter New Room search to users

**Feature Branch:** work

## User-only room discovery

The Messages New Room picker now passes the shared search utility’s user category and type filter, matching the filtered-search parameters used by Jitsi Meet and excluding unrelated result types.

## Responsive search status

Search now replaces the minimum-length prompt with a loading state as soon as an eligible query runs. Failed and timed-out requests render an explicit error instead of leaving stale results or an unresponsive prompt.

## Synchronized incoming-call prompts

Incoming calls now appear in a bar immediately above the Messages thread header. Answer and Decline resolve the correlated notification and in-chat prompt together, while a per-user ringing lease prevents multiple tabs or surfaces from playing duplicate ringtones.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
