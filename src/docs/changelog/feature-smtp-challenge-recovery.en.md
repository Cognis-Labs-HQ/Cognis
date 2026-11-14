# SMTP Challenge Delivery

**Feature Branch:** feature-smtp-challenge-recovery

## Bind delivery to its owning challenge

For Email Code, “queued” means delivery is still pending, not sent. Wait for the latest code. A resend replaces the previous code only when accepted; a rejected resend leaves it unchanged. After delivery failure, explicitly resend before the attempt expires, or start a new login. Login attempts last five minutes and setup lasts ten minutes. Cancelling setup affects only that setup. Resuming a login does not send another email or extend its deadline.

Method adapters receive required `lifetime: { id, expiresAt, signal }` inputs for setup, login challenge and login verification. Callers of `tfa:getLoginMethods(accountId, lifetime)` and `tfa:verifyLogin(accountId, methodId, payload, lifetime)` must migrate. Setup owns a distinct ten-minute lifetime before its first asynchronous read. Auth supplies the immutable login lifetime through `auth:getPendingLoginLifetime` version 1. Cancellation, expiry, failed persistence, account-method disable, reset and gateway cleanup invalidate the exact operation. Admission guards reject old reads even after re-enable. Verification before the enrollment commit point can be cancelled; after the write starts, cancellation and reset await the visible commit/cleanup barrier before returning. Recovery-code verification also checks lifetime after asynchronous consumption. Disposing or restarting loses pending in-memory challenges. SMTP completion and retained login descriptors are separate: a resumed descriptor is an admission snapshot, not a live delivery receipt.

## Required provider migration

SMTP TFA requires `notify:deliverEmail` version 1 through the public contract registry; there is no fallback to `notify:sendEmail` or an ignored optional flag. A newly admitted code replaces and cancels only its matching older delivery. Rejected admission preserves the prior code. Later delivery failure invalidates the candidate; explicitly resend while the owning attempt remains live to recover. Concurrent resends coalesce only for the same owner operation. Independent setup and login operations keep separate IDs and cancellation. Codes expire at the earlier of the owner deadline and 15 minutes, are single-use, and cannot be restored by a late callback. Queued and sent messages have distinct presentation. Deploy Notification SMTP 0.5.5, SMTP TFA 1.1.3, TFA 1.3.12 and Auth 2.2.11 together; alternative providers must implement the named contract before use.

`auth:getPendingLoginLifetime` version 1 is a read-only public lookup of `{ id, accountId, expiresAt, signal }` for an existing primary-authenticated attempt. It cannot create or extend authority. Auth allocates the attempt before automatic factor preparation without issuing a session or activating a profile. Its immutable five-minute deadline applies to delivery. Consumption, explicit cancellation, expiry, continuation replacement, logout and owner cleanup abort challenge resources. Existing cookie-bound continuation, stale-attempt guards and resume without redelivery remain unchanged. Successful factor consumption cancels challenge resources without cancelling the separate final session commit. TFA requires this contract and fails closed when it is absent.

`notify:deliverEmail` version 1 accepts a registered purpose, recipient, variables, required `signal: AbortSignal` and an absolute millisecond `expiresAt`. It reuses the existing validate/render/enqueue flow and purpose queue. Admission returns `{ receipt, completion }`; `completion` resolves a terminal `sent` or `failed` receipt. Queued, rate-limited and sending receipts are not proof of delivery. Abort, expiry or purpose disposal cancels queued work and the active transport; a late transport result cannot overwrite failure. Ordinary `notify:sendEmail` keeps its existing deferred behavior. The default greylist policy permits two five-minute waits, but bounded deliveries stop at their earlier owner deadline. Mail already accepted by the remote SMTP server cannot be recalled.

## Serialize terminal transitions

Account, method and gateway terminal operations block new admissions throughout cleanup and their state write. Each overlapping operation owns its own barrier token; finishing one does not reopen another. A failed enrollment write remains a verification failure, but cleanup waits for its settlement without preventing a later reset or disable from applying its own state change.

## Commits

- [f07343ef8ff8b9d223a46758f8c91a88ffbcc588](https://github.com/Cognis-Labs-HQ/Cognis/commit/f07343ef8ff8b9d223a46758f8c91a88ffbcc588)
