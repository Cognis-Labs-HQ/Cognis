# Invitation Email Feedback

**Feature Branch:** feature-invitation-email-validation

## Correct The Recipient Before Sending

Registration 1.2.10 validates required recipient addresses with the shared form builder and native email syntax. Localized toast feedback identifies and focuses the invalid field while retaining the entry for correction. Click and Enter use the same check.

## Keep Invitation Actions Scoped

Repeated actions cannot issue duplicate requests within one pending attempt. Close, Escape and navigation release the email form; late completions do not refresh a replacement page. Server policy and existing invitation outcomes remain unchanged. The invitation guide explains correction in all four languages.

## Preserve Validation Boundaries

Missing validation translations remain explicit application errors instead of generic invitation failures. Newly opened dialogs keep their own label and error associations even while the previous dialog is closing. Provider error details are not displayed as validation text.

## Commits

- [d7abffa488609d4d3644526683ed2058e2cf78cf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d7abffa488609d4d3644526683ed2058e2cf78cf)
