# Loading Overlay Fix

## Loading wheel no longer appears over password confirmation popups

The page loading overlay is now suppressed whenever any popup is open, preventing it from obscuring password confirmation and other interactive prompts that open during page mount.

## Password confirmation input is now properly wrapped in a form

The password input inside the re-prompt guard popup is now wrapped in a `<form>` element, eliminating the browser warning about password fields that are not contained in a form.
