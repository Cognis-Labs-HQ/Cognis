# Popup Keyboard Access

**Feature Branch:** feature-popup-keyboard

## Keyboard Popup Navigation

Every popup has its own accessible heading, including nested unsaved-change confirmations and multi-page dialogs. Tab and Shift+Tab stay inside the active dialog. Keeping a draft returns focus to its editor; closing the last dialog returns focus to its available opening control, or to the page when that control is gone. Empty dialogs keep focus until controls become available. Navigation cancellation releases popup focus ownership without moving focus back onto the old page. Closing animations do not retain keyboard ownership. These shared controls also apply to dialogs opened from guided tutorials.

## Scoped Tutorial Focus

The additive `ui:popupFocus` capability coordinates popup owners through `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })`, and `restore(overlay, preferred)`. Registration belongs to the popup renderer. A tutorial delegates only the exact active popup accepted by its current step; the delegate supplies its allowed targets and controls, connected same-document surfaces, and focus callback. The required abort signal, removal of a delegated surface, or popup dismissal revokes the delegation. A newer popup keeps exclusive focus, including before its opening animation. Closing or replaying a tutorial restores ordinary popup keyboard handling without reopening a dismissed page. The `openPopup` options remain unchanged.

The required `onRevoke` callback removes delegated event handlers synchronously before focus is returned.

Delegated callbacks are synchronous, and `contains` must return a boolean. A thrown error, invalid predicate value, asynchronous return, or recursive focus attempt revokes the delegation, records safe diagnostic metadata, and restores ordinary popup focus handling. Callback and logging failures cannot interrupt popup dismissal or leave its result pending.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/75f90adb08a6d21bd480cab2218ad8c2532228d3
- https://github.com/Cognis-Labs-HQ/Cognis/commit/76df42287d7c3085686dfcbfc6659c3fa0cfff92
- https://github.com/Cognis-Labs-HQ/Cognis/commit/6f3e9c53f6b2c9d8bd372047af84445af5906d59
- https://github.com/Cognis-Labs-HQ/Cognis/commit/163fbaaa08f85fcd021ec982d9f3ec35e9727979
