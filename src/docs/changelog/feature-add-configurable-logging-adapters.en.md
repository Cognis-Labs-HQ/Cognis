# Configurable logging outputs

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
