# Browsable Docs History

## Versioned documentation snapshots

Cognis now archives each component's documentation at startup using the version declared by that component's manifest. Documentation URLs default to the magic `latest` version while retaining access to earlier snapshots.

The documentation and changelog readers now handle an unavailable or malformed documentation index without failing to mount the page.

## Version browser

The documentation reader now shows a horizontally scrollable version bar above each document title so readers can switch between current and historical content.
