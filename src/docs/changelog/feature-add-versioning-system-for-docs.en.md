# Browsable Docs History

**Feature Branch:** feature-add-versioning-system-for-docs

## Versioned documentation snapshots

Cognis now archives each component's documentation at startup using the version declared by that component's manifest. Documentation URLs default to the magic `latest` version while retaining access to earlier snapshots.

The documentation and changelog readers now handle an unavailable or malformed documentation index without failing to mount the page.

Local development stores snapshots in the current user's Cognis directory, while packaged servers carry the platform manifest needed to version root documentation. This prevents the docs API from returning a `400` response when its runtime layout differs from the source tree.

## Version browser

The documentation reader now shows a horizontally scrollable version bar above each document title so readers can switch between current and historical content.

## Keep removed documents available

The documentation index now includes archived documents even after their source file is renamed or removed, so every preserved version remains browsable.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ad5ede84f3181c47669ecc0e3655b4321fba8a34
