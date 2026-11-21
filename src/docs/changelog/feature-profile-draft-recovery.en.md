# Profile Draft Recovery

**Feature Branch:** feature-profile-draft-recovery

## Keep Failed Drafts

Edit Profile keeps the exact entered fields open until the server acknowledges the save or the account-bound offline buffer durably accepts it. A rejected request, unreadable response or failed buffer write shows an error and restores Save without discarding the draft. Repeated Save clicks and Enter submit only one pending request; fields are temporarily disabled while it runs. Optional card, navbar or local display-name refresh errors do not turn an accepted save into a failed write.

## Respect Editor Lifetimes

Discard, Close, Escape and the backdrop use the shared unsaved-change confirmation. Cancel in the confirmation retains the form. Confirming Discard closes it and ignores late callbacks; closing cannot undo a request already sent, and an informational toast says so. A save result waits for an open discard decision before updating the page. Navigation, a new mount, account/session changes and popup disposal invalidate old editor callbacks. Reopening uses the last accepted profile, with unique field/label identifiers even while the previous popup animates closed. Unsubmitted drafts are not persisted across navigation or reload.

The Profile-owned editor uses the existing `social:profile:request` ctx flow and preserves its field-validation gate, shared popup focus ownership and offline delivery policy. Synthetic DOM tests exercise the real page mount, popup, form builder and registered request flows with controlled transport and storage. They do not establish live browser layout or server/database behavior.

The UI publication check follows the post form’s actual attached builder through owner-local factory returns. Static positive and negative fixtures reject missing, unused, shadowed or reassigned factories, bypass return values and unmatched submission handlers; raw-form checks and scan coverage remain unchanged.

## Commits

- [32c9d98c20195e3dafa77f544ff01eca85dc3c9d](https://github.com/Cognis-Labs-HQ/Cognis/commit/32c9d98c20195e3dafa77f544ff01eca85dc3c9d)
- [52584bd588518e3ae7c2527df85466c10c7cf47a](https://github.com/Cognis-Labs-HQ/Cognis/commit/52584bd588518e3ae7c2527df85466c10c7cf47a)
- [c24abd04d518430c69b3e6cae8d5a60aef48121a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c24abd04d518430c69b3e6cae8d5a60aef48121a)
- [bc8caea0fe96ea2133554b84f1b96dd91ea50e92](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc8caea0fe96ea2133554b84f1b96dd91ea50e92)
