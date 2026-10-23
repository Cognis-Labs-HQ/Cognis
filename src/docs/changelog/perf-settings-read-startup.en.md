# Faster Settings Startup

**Feature Branch:** perf-settings-read-startup

## Overlap Independent Reads

Settings loads account preferences, editor acknowledgement and setup status concurrently. After checking the setup redirect, it loads section descriptors alongside localization. Each mount still requests current data; no preference or private-response cache is added.

## Preserve Locale and Setup Rules

Saved language preferences are applied before localization starts. Required setup redirects complete before section discovery or rendering. Behavioral tests execute the real mount initialization through explicit dependency contracts and check repeated account changes.

## Commits

- [1e90970ab5e72dc6b32779b956341477875a153c](https://github.com/Cognis-Labs-HQ/Cognis/commit/1e90970ab5e72dc6b32779b956341477875a153c)
