# Native layout actions

**Feature Branch:** feature-composer-native646

## Native layout actions

Main and nested layout panels use native `button type="button"` controls for Done, Discard and Reset. These actions do not submit an enclosing form or navigate. Pending layout submissions disable them through the existing editor lock; failed submissions restore the controls for an explicit retry. Done still saves and closes after acknowledgement, Discard restores the local baseline without writing, and Reset saves the default layout while editing continues. Existing action classes and the workspace tutorial target `#composer-edit-toggle` remain unchanged.

## Commits

- [7dcf289b56fe90332c57b27f21f108dbb63140f8](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dcf289b56fe90332c57b27f21f108dbb63140f8)
- [45986f62b4584520efcf707b8d1b0c2610a880a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/45986f62b4584520efcf707b8d1b0c2610a880a8)
- [f03db8184a93fb4f015aea9d8b09684e0361eb38](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03db8184a93fb4f015aea9d8b09684e0361eb38)
