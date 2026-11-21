# Popup Preparation

**Feature Branch:** feature-popup-preparation642

## Cancel Pending Openings

An already-aborted `openPopup` returns `null` without acquiring resources. Aborting during stylesheet or locale preparation also returns `null` promptly, without canceling another opening or the shared locale initialization. No failed or canceled opening acquires a modal, focus ownership or scroll lease. Locale failures remain explicit and permit a later initialization attempt.

## Retry Failed Styles

Popup styles share `ui:popupPreparation` across bundled and directly served callers. Each explicit opening shares one attempt bounded to five seconds, including up to one second for a cached complete sheet or an active cache refresh. Missing, unhealthy, empty, rejected or stalled cache reads fall back to the network within that attempt. Healthy existing links are reused; pending links are observed. Failure removes only owned links, preserves adopted links and excludes failed links from later attempts. Timeout and load failure reject `openPopup`, rather than reporting a dismissal or opening an unstyled blocking dialog. Live waiters receive one localized error toast per failed attempt. Canceled waiters never publish delayed feedback. A later explicit opening retries; there is no automatic retry loop.

`primePopupStylesheet()` still refreshes the complete sheet for offline recovery, coalesces concurrent refreshes and logs failures without rejecting. Refreshes have a five-second bound. Late operations cannot install or replace DOM styles after expiry; Cache Storage writes already submitted to the browser cannot be revoked. Priming failure does not disable future modal recovery. Anchored previews retain their synchronous controller, consume preparation failures, hide a failed preview and retry on later `show`; `hide` and `destroy` fence delayed feedback. Existing runtime-error resource handling recognizes owned stylesheet failures without recursively reporting them.

Tutorial targets, completion IDs, actions, Next, Back, Restart and replay are unchanged. Visible modal focus, nested dialogs, discard confirmation, action handling, timeout and rollback contracts remain unchanged. Shared UI has no independent package version.

The five-second bound applies only to the stylesheet attempt, not total `openPopup` preparation. Strict locale initialization retains its existing lifetime without a new timeout; it can delay localized failure feedback and rejection, but the opening signal still cancels promptly. Healthy anchored previews do not initialize modal locale resources.

## Commits

- [79e3b60b563710a7b5372edbb6476af78b62b83a](https://github.com/Cognis-Labs-HQ/Cognis/commit/79e3b60b563710a7b5372edbb6476af78b62b83a)
