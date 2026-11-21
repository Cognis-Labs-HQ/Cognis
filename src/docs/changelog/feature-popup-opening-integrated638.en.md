# Popup Opening Cleanup

**Feature Branch:** feature-popup-opening-integrated638

## Failed openings release the page

A synchronous error during initial popup setup now removes the failed dialog and releases its focus, listeners, timers, dirty tracking and scroll lease before returning the original error. A pending discard confirmation is canceled with its failed owner. Image Preview uses the same shared cleanup without suppressing translation errors.

## Existing interaction stays intact

Live parent dialogs and newer openings retain their own ownership. Reentrant close or abort keeps an already settled result. Normal animations, mandatory dialogs, action callbacks, dirty confirmation, page switches and tutorial targets, controls and replay retain their contracts. Initializers remain synchronous; returned promises are not awaited. Shared UI has no separate package version.

## Commits

- [2ff0d83d7db9486b5ca3f7ef727274176298b46d](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ff0d83d7db9486b5ca3f7ef727274176298b46d)
- [982f35dbce4f8070fbf34696f52c30ac53c3b1a1](https://github.com/Cognis-Labs-HQ/Cognis/commit/982f35dbce4f8070fbf34696f52c30ac53c3b1a1)
