# Native layout actions

**Feature Branch:** feature-composer-native646

## Native layout actions

Main and nested layout panels use native `button type="button"` controls for Done, Discard and Reset. These actions do not submit an enclosing form or navigate. Pending layout submissions disable them through the existing editor lock; failed submissions restore the controls for an explicit retry. Done still saves and closes after acknowledgement, Discard restores the local baseline without writing, and Reset saves the default layout while editing continues. Existing action classes and the workspace tutorial target `#composer-edit-toggle` remain unchanged.

## Commits

- [970aa487446925844715c97c20beba2d14546f60](https://github.com/Cognis-Labs-HQ/Cognis/commit/970aa487446925844715c97c20beba2d14546f60)
