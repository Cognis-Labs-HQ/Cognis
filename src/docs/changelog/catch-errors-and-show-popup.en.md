# Runtime Error Popup

## Catch Route Load Failures

The SPA router now wraps navigation loading in a full `try/catch/finally` flow.
When route scripts fail to load, the loading overlay is always released so users
do not get stuck on an infinite spinner.

## Show Report-Ready Debug Details

Dashboard runtime failures now open a danger popup that includes an error
summary, stack trace, page URL, and recent console output so users can copy the
details directly into bug reports.
