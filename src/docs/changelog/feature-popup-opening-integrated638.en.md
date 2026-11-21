# Popup Opening Cleanup

**Feature Branch:** feature-popup-opening-integrated638

## Failed openings release the page

A synchronous error during initial popup setup now removes the failed dialog and releases its focus, listeners, timers, dirty tracking and scroll lease before returning the original error. A pending discard confirmation is canceled with its failed owner. Image Preview uses the same shared cleanup without suppressing translation errors.

## Existing interaction stays intact

Live parent dialogs and newer openings retain their own ownership. Reentrant close or abort keeps an already settled result. Normal animations, mandatory dialogs, action callbacks, dirty confirmation, page switches and tutorial targets, controls and replay retain their contracts. Initializers remain synchronous; returned promises are not awaited. Shared UI has no separate package version.

## Commits

- [3f7f66637a28f7f73411e557fe6d90c94e60ef45](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f7f66637a28f7f73411e557fe6d90c94e60ef45)
- [1e19a0040518af575759196659d91a8119ef9362](https://github.com/Cognis-Labs-HQ/Cognis/commit/1e19a0040518af575759196659d91a8119ef9362)
