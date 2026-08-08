# Configurable logging outputs

## Independent console and file log levels

Administrators can now select separate severity thresholds for console and file logging from the supported levels defined by the logging gateway.

## Runtime overrides with environment reset

Logging adapter settings can override Docker environment values at runtime, including console format, file path, and rotation behavior, and can be reset to the environment configuration.

## Settings for always-on adapters

The Console Logging and File Logging rows now open their settings popup even though these required adapters cannot be disabled.

## Synchronized live output

The configured severity and format now replace the early bootstrap logger for all subsequently loaded gateways, so Docker output immediately follows console changes. Environment-override warnings now appear in orange beside their field headings.
