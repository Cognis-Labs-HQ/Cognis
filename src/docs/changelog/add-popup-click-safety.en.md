# Popup Form Close Safety

**Feature Branch:** copilot/add-popup-click-safety

## Confirmation dialog before discarding unsaved form changes

Popups that contain form inputs now intercept close attempts — via the backdrop click, the × button, or the Escape key — and show a confirmation dialog when any field has been modified. Clicking "Discard" closes the form; clicking "Cancel" returns the user to their in-progress edits.

## Affected popups

Profile edit, password change, adapter configuration, invite email, user input prompts, teacher application, and student invite popups all gain this protection. The `openPopup` API accepts a new `closeProtection` option that enables the guard on any form popup with pre-resolved i18n strings.

## Commits

- [b943b35](https://github.com/Cognis-Labs-HQ/Cognis/commit/b943b359f0aff9872e9c4817e28c4b2381a16253)
