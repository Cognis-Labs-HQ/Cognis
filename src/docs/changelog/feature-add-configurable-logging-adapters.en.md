# Configurable logging outputs

**Feature Branch:** feature-add-configurable-logging-adapters

## Independent console and file log levels

Administrators can now select separate severity thresholds for console and file logging from the supported levels defined by the logging gateway.

## Runtime overrides with environment reset

Logging adapter settings can override Docker environment values at runtime, including console format and rotation behavior, and can be reset to the environment configuration. The Reset action previews environment values in the form; administrators must select Save Settings to commit the reset. The environment continues to own the log file path. Overrides are stored in the database and restored after container restarts.

## Settings for always-on adapters

The Console Logging and File Logging rows now open their settings popup even though these required adapters cannot be disabled.

## Synchronized live output

The configured severity and format now replace the early bootstrap logger for all subsequently loaded gateways, so Docker output immediately follows console changes. Environment-override warnings now appear in orange beside their field headings.

## Clearer configuration labels

Override warnings now read “Overriding env variable”, and the file adapter’s compression option is named “Log Compression”.

## Adapter-owned, validated configuration

Console and file adapters now own their configuration validation and logger mapping. File overrides reject unsafe rotation sizes and retention counts before they are applied.

## Translated logging settings

Logging field labels now use adapter-owned German, English, Indonesian, and Japanese resources, which Administration loads before rendering the configuration form.

## Dependency-aware gateway startup

Gateway bootstrap now honors declared dependencies before priority ordering, ensuring database-backed logging preferences are available before the logging gateway starts.

## Auditable, extensible configuration

Runtime validation errors are now localized, every discovered logging adapter receives its own effective configuration, and configuration updates and resets emit structured audit events.

## Runtime console updates

Console configuration changes now update the same runtime logging function used by the application and by configuration audit events, so new levels and formats take effect immediately.

## Docker console threshold

Early bootstrap logging now applies `LOG_LEVEL` before the logging gateway starts, so the Docker default of `info` suppresses debug output throughout startup.

## Commits

- [1a843d6](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a843d6bcc3ff03b2c40d841f75d29d79da7dc6d)
