# Native layout actions

**Feature Branch:** feature-composer-native646

## Native layout actions

Main and nested layout panels use native `button type="button"` controls for Done, Discard and Reset. These actions do not submit an enclosing form or navigate. Pending layout submissions disable them through the existing editor lock; failed submissions restore the controls for an explicit retry. Done still saves and closes after acknowledgement, Discard restores the local baseline without writing, and Reset saves the default layout while editing continues. Existing action classes and the workspace tutorial target `#composer-edit-toggle` remain unchanged.

## Commits

- [d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc](https://github.com/Cognis-Labs-HQ/Cognis/commit/d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc)
- [ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0)
- [2d77508cffcb4eb46900f76d4f4174dba1799f7c](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d77508cffcb4eb46900f76d4f4174dba1799f7c)
