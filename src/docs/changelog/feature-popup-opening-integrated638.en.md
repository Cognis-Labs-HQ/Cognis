# Popup Opening Cleanup

**Feature Branch:** feature-popup-opening-integrated638

## Failed openings release the page

A synchronous error during initial popup setup now removes the failed dialog and releases its focus, listeners, timers, dirty tracking and scroll lease before returning the original error. A pending discard confirmation is canceled with its failed owner. Image Preview uses the same shared cleanup without suppressing translation errors.

## Existing interaction stays intact

Live parent dialogs and newer openings retain their own ownership. Reentrant close or abort keeps an already settled result. Normal animations, mandatory dialogs, action callbacks, dirty confirmation, page switches and tutorial targets, controls and replay retain their contracts. Initializers remain synchronous; returned promises are not awaited. Shared UI has no separate package version.

## Commits

- [bc19cea34dc3a2c52b07ac47ed49d2fdfb8b5301](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc19cea34dc3a2c52b07ac47ed49d2fdfb8b5301)
- [3e9a85d44408718a08618b285cd0e802184d5841](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e9a85d44408718a08618b285cd0e802184d5841)
