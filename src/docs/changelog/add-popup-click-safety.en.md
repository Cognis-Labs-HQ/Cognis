# Popup Form Close Safety

## Confirmation dialog before discarding unsaved form changes

Popups that contain form inputs now intercept close attempts — via the backdrop click, the × button, or the Escape key — and show a confirmation dialog when any field has been modified. Clicking "Discard" closes the form; clicking "Cancel" returns the user to their in-progress edits.

## Affected popups

Profile edit, password change, adapter configuration, invite email, user input prompts, teacher application, and student invite popups all gain this protection. The `openPopup` API accepts a new `closeConfirm` option that enables the guard on any form popup with pre-resolved i18n strings.
