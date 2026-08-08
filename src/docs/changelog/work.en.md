# Incidental Request Fixes

## Reliable localized resources
Added complete German, Indonesian, and Japanese SMTP two-factor strings so supported locale requests no longer return missing-resource errors.

## Changelog routes with dots
Documentation routes now accept valid changelog slugs containing registry host names with dots.

## Authenticated browser telemetry
Browser performance submissions now include the active bearer token and are skipped when the user is signed out.
