# Concise Test Paths

**Feature Branch:** refactor-fixture-paths

## Flatten build fixtures

Keep UI build assets in a compact fixture directory and assemble the production layout only in the temporary build test. Preserve entrypoint sharing, stylesheet publication, and static asset handling.

Remove unused SQLite fixture copies; the PostgreSQL fixture retains the provider and SQL phase directories exercised by database discovery.

## Group related tests

Place related tests in subject directories and shorten filenames, updating imports and resource references while retaining recursive test discovery.

## Enforce path conventions

The canonical AI instructions and repository checks prohibit replicated fixture source trees and redundant test subject prefixes. Meaningful provider and package layouts remain supported.

## Commits

- [813655a37](https://github.com/Cognis-Labs-HQ/Cognis/commit/813655a3755f2b63a051ba6bdf928f02ece6dc65)
- [1073bd61a](https://github.com/Cognis-Labs-HQ/Cognis/commit/1073bd61a68cd035229e346d33338b2380219a9d)
