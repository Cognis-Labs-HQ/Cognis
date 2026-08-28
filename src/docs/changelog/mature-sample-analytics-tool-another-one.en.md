# Analytics Admin Section

**Feature Branch:** copilot/mature-sample-analytics-tool-another-one

## Sample Analytics module replaced by a full Analytics section in Administration

The Sample Analytics module has been matured into a complete user activity analytics
tool. The former placeholder dashboard element has been removed.

## Analytics tab in Administration shows real user metrics

Administration → Analytics displays summary stat cards (total users, active users
in the last 7 days, new registrations over the selected period), a registration
trend bar chart for the last 7, 30, or 90 days, and a role breakdown with inline
percentage bars.

## Interactive time-range filter updates all charts and stats live

A time-range filter lets admins switch between 7, 30, and 90-day windows. Clicking
Refresh re-fetches all data and updates the stat cards, bar chart, and events log
in place without a full page reload.

## Custom event recording API

A new `POST /api/v1/modules/analytics/activity-log` endpoint allows any admin to
record a custom named event (with optional metadata) against the analytics events
table. Recorded events appear in the Events log within the Analytics admin section.

## New API endpoints for metrics and series data

Three admin-authenticated API routes replace the former stub metrics endpoint:
`/api/v1/modules/analytics/metrics` (summary counts and role breakdown),
`/api/v1/modules/analytics/series` (daily registration series), and
`/api/v1/modules/analytics/activity-log` (recent custom events log).

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/56958a72892cc2d963b827c84d50783e099d185e
