# Cleaner Adapter Controls

**Feature Branch:** feature-remove-config-popup-from-adapters

## Removed Empty Settings Popups

Adapter rows no longer open a settings popup when the adapter has no configurable fields beyond its power state. Clicking these rows expands their manifest details, while the existing row power control enables or disables them.

## LDAP Power Control

The LDAP Authentication settings popup now includes a power control so administrators can enable or disable the adapter without leaving its configuration.

## Component controls stay synchronized

Administration now consistently labels active components as Enabled, keeps locked configuration controls disabled, refreshes component health and navigation after power changes, shows adapter manifest details when no settings exist, and permits Share methods to be disabled. Authenticator App setup defaults to SHA-256. Adapter settings titles no longer duplicate manifest versions.

## Share Adapter State Persists

Disabled Share adapters now remain disabled after a server restart, and previously issued shares stop resolving while their adapter is disabled.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/bde0ea7a65b26aa85e467dc7954e6db3c652e701
