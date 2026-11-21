# Invitation Email Feedback

**Feature Branch:** feature-invitation-email-validation

## Correct The Recipient Before Sending

Registration 1.2.10 validates required recipient addresses with the shared form builder and native email syntax. Localized toast feedback identifies and focuses the invalid field while retaining the entry for correction. Click and Enter use the same check.

## Keep Invitation Actions Scoped

Repeated actions cannot issue duplicate requests within one pending attempt. Close, Escape and navigation release the email form; late completions do not refresh a replacement page. Server policy and existing invitation outcomes remain unchanged. The invitation guide explains correction in all four languages.

## Preserve Validation Boundaries

Missing validation translations remain explicit application errors instead of generic invitation failures. Newly opened dialogs keep their own label and error associations even while the previous dialog is closing. Provider error details are not displayed as validation text.

## Commits

- [be4a0ea68ce95344b01e2bb3a08691b49fa56c14](https://github.com/Cognis-Labs-HQ/Cognis/commit/be4a0ea68ce95344b01e2bb3a08691b49fa56c14)
- [c6e50192a043d62485e48f7a9f7fa4781fda0c4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6e50192a043d62485e48f7a9f7fa4781fda0c4b)
