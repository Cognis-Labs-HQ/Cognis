# Runtime Error Popup

**Feature Branch:** copilot/catch-errors-and-show-popup

## Catch Route Load Failures

The SPA router now wraps navigation loading in a full `try/catch/finally` flow.
When route scripts fail to load, the loading overlay is always released so users
do not get stuck on an infinite spinner.

## Show Report-Ready Debug Details

Dashboard runtime failures now open a danger popup that includes an error
summary, stack trace, page URL, and recent console output so users can copy the
details directly into bug reports.

## Commits

- [e4c47c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4c47c446cf5d1b5d2eceba77a5e1d796735d84d)
