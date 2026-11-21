# Invitation Email Feedback

**Feature Branch:** feature-invitation-email-validation

## Correct The Recipient Before Sending

Registration 1.2.10 validates required recipient addresses with the shared form builder and native email syntax. Localized toast feedback identifies and focuses the invalid field while retaining the entry for correction. Click and Enter use the same check.

## Keep Invitation Actions Scoped

Repeated actions cannot issue duplicate requests within one pending attempt. Close, Escape and navigation release the email form; late completions do not refresh a replacement page. Server policy and existing invitation outcomes remain unchanged. The invitation guide explains correction in all four languages.

## Preserve Validation Boundaries

Missing validation translations remain explicit application errors instead of generic invitation failures. Newly opened dialogs keep their own label and error associations even while the previous dialog is closing. Provider error details are not displayed as validation text.

## Commits

- [299e6dcaf23f509610d0681d0a1bd4db52b4ae7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/299e6dcaf23f509610d0681d0a1bd4db52b4ae7b)
- [975769be24f31ae7dee8b2b3d15a02b910cd1268](https://github.com/Cognis-Labs-HQ/Cognis/commit/975769be24f31ae7dee8b2b3d15a02b910cd1268)
