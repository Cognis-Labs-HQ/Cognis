# Native layout actions

**Feature Branch:** feature-composer-native646

## Native layout actions

Main and nested layout panels use native `button type="button"` controls for Done, Discard and Reset. These actions do not submit an enclosing form or navigate. Pending layout submissions disable them through the existing editor lock; failed submissions restore the controls for an explicit retry. Done still saves and closes after acknowledgement, Discard restores the local baseline without writing, and Reset saves the default layout while editing continues. Existing action classes and the workspace tutorial target `#composer-edit-toggle` remain unchanged.

## Commits

- [eadda4b8f2ffdd8cdb9da3fc4205b3fb09524529](https://github.com/Cognis-Labs-HQ/Cognis/commit/eadda4b8f2ffdd8cdb9da3fc4205b3fb09524529)
- [9dc32536b63fe4a385001b74b52c8bc0a725784e](https://github.com/Cognis-Labs-HQ/Cognis/commit/9dc32536b63fe4a385001b74b52c8bc0a725784e)
