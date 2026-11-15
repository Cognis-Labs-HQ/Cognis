# Popup Opening Cleanup

**Feature Branch:** feature-popup-opening-integrated638

## Failed openings release the page

A synchronous error during initial popup setup now removes the failed dialog and releases its focus, listeners, timers, dirty tracking and scroll lease before returning the original error. A pending discard confirmation is canceled with its failed owner. Image Preview uses the same shared cleanup without suppressing translation errors.

## Existing interaction stays intact

Live parent dialogs and newer openings retain their own ownership. Reentrant close or abort keeps an already settled result. Normal animations, mandatory dialogs, action callbacks, dirty confirmation, page switches and tutorial targets, controls and replay retain their contracts. Initializers remain synchronous; returned promises are not awaited. Shared UI has no separate package version.

## Commits

- [d3cde8f4eb18f2b646fe2fdd9128513db9d5365d](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cde8f4eb18f2b646fe2fdd9128513db9d5365d)
- [c6f12076f510b9853f0a9a63a1777f4a1138cd48](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6f12076f510b9853f0a9a63a1777f4a1138cd48)
- [31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc](https://github.com/Cognis-Labs-HQ/Cognis/commit/31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc)
