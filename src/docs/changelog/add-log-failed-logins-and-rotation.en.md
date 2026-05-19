# Logging Stream Filtering,...

## Summary

- Raised failed-login and noteworthy user account mutation logs to warning level.
- Changed logging so all log levels are persisted to the log file.
- Applied `LOG_LEVEL` as a filter for runtime log-stream output while persisting all levels to file.
- Added backend log rotation with gzip compression for rotated archives.
- Set the Administration logs priority filter default to warning.

## Changed Files/Components

- `src/gateways/logging/logger.ts`
- `src/gateways/logging/bootstrap.ts`
- `src/gateways/logging/ui/admin-section.js`
- `src/api/routes/users/index.ts`
- `src/gateways/logging/tests/*`
- `src/api/tests/users/user-routes.test.ts`
- `src/gateways/logging/manifest.json`
- `src/docs/versions.en.md`
- `src/gateways/logging/docs/index.*.md`
- `src/docs/devops.*.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/749469a351ca8fad839ef6cf3f3d4eed81717b3a
