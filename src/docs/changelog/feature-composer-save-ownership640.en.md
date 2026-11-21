# Composer Save Protection

**Feature Branch:** feature-composer-save-ownership640

## Protect Pending Layout Saves

Main and nested editors keep leave protection while Done or Reset awaits acknowledgement. Layout changes and repeated submissions are blocked during the request. Accepted saves retain the exact submitted column profile without sharing mutable draft data. Acknowledgement requires HTTP `200` and JSON `data.saved === true`; missing account or access token prevents a write.

## Recover Without Losing Drafts

Rejected HTTP responses and request errors retain the protected draft and show localized recovery guidance. Retry or discard is deliberate; a lost response has an unknown server outcome and is never automatically replayed. Shared documentation now describes the current preferences URL and profile payload. Unconfirmed responses retain protection too. Discard returns to the previous local baseline, which is not necessarily confirmed server state; retry sends a new request. Inactive nested subpages do not receive late feedback, and disposed composers ignore completion.

Recovery guidance is dismissed when you retry, discard, leave the section or close the page, so an older message cannot reappear over another editing session.

## Commits

- [bcfcae00603336ddd5099b3b401a94ed157b00ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcfcae00603336ddd5099b3b401a94ed157b00ec)
- [26ba8999e905199018ecc0ab1b25e0ccc4cec107](https://github.com/Cognis-Labs-HQ/Cognis/commit/26ba8999e905199018ecc0ab1b25e0ccc4cec107)
