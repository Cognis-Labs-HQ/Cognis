# Incidental Request Fixes

**Feature Branch:** feature-fix-404-and-401-incidental-errors

## Reliable localized resources

Added complete German, Indonesian, and Japanese SMTP two-factor strings so supported locale requests no longer return missing-resource errors.

## Changelog routes with dots

Documentation routes now accept valid changelog slugs containing registry host names with dots.

## Authenticated browser telemetry

Browser performance submissions now include the active bearer token and are skipped when the user is signed out.

## Reliable global message search

Restored the authenticated API client import used by the global message search provider, preventing repeated provider failures.

## Commits

- [763fb50](https://github.com/Cognis-Labs-HQ/Cognis/commit/763fb5075a083b6e2410711d5da84e81cdab46dc)
