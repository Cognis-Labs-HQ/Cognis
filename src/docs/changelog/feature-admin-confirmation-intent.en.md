# Administration Decisions

**Feature Branch:** feature-admin-confirmation-intent

## Administration Decisions

Component Disable dialogs put neutral Cancel first and use a danger-styled Disable action. Enable remains constructive. Cancel, the close control and Escape leave component state unchanged. Pending controls cannot start the same operation again; leaving the component view, replacing the Administration page or changing the active session cancels unsubmitted work. Already submitted requests cannot be undone. A rejected request stops dependent changes. If a result is uncertain or a later refresh fails after accepted changes, the affected control remains unavailable until Administration is reloaded to read current status. Dirty-section navigation keeps Stay neutral and Discard and Leave destructive; only the latter removes the draft.

Component decisions require valid identifiers and explicit current states. Invalid inventory responses cannot authorize a disable sequence or release a control after an accepted change.

Individually locked adapters remain managed by their gateway. Gateway actions do not submit individual changes for them or offer them as adapter Enable choices.

## Commits

- [cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a)
- [da2f1f42738a2b3d61fa73a9624fb670557382ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/da2f1f42738a2b3d61fa73a9624fb670557382ad)
- [40d08231edb4630d69d1178097a50b06f3f05fd9](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d08231edb4630d69d1178097a50b06f3f05fd9)
- [5be1992292d6d641d75805fe58a48c5555cc7940](https://github.com/Cognis-Labs-HQ/Cognis/commit/5be1992292d6d641d75805fe58a48c5555cc7940)
- [cc01b0af6c503b4e1b54b4e0cc040d22363d1c89](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc01b0af6c503b4e1b54b4e0cc040d22363d1c89)
- [a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae)
