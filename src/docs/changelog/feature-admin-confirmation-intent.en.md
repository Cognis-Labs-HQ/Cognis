# Administration Decisions

**Feature Branch:** feature-admin-confirmation-intent

## Administration Decisions

Component Disable dialogs put neutral Cancel first and use a danger-styled Disable action. Enable remains constructive. Cancel, the close control and Escape leave component state unchanged. Pending controls cannot start the same operation again; leaving the component view, replacing the Administration page or changing the active session cancels unsubmitted work. Already submitted requests cannot be undone. A rejected request stops dependent changes. If a result is uncertain or a later refresh fails after accepted changes, the affected control remains unavailable until Administration is reloaded to read current status. Dirty-section navigation keeps Stay neutral and Discard and Leave destructive; only the latter removes the draft.

Component decisions require valid identifiers and explicit current states. Invalid inventory responses cannot authorize a disable sequence or release a control after an accepted change.

Individually locked adapters remain managed by their gateway. Gateway actions do not submit individual changes for them or offer them as adapter Enable choices.

## Commits

- [6342a4eb2a30cea329002d0d25f591bdf24f4a15](https://github.com/Cognis-Labs-HQ/Cognis/commit/6342a4eb2a30cea329002d0d25f591bdf24f4a15)
- [81dac9ef19028268e7124a6feb3dd7747c57c3ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/81dac9ef19028268e7124a6feb3dd7747c57c3ce)
