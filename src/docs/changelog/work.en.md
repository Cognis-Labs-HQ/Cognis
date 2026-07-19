# Account States

## Clearer lifecycle controls

Danger-zone account actions now use consistent cancel-styled buttons, deactivation warning copy no longer says administrator intervention is required, and confirmation popups submit when Enter is pressed.

## Admin status clarity

The Users page now shows archived and deactivated account states explicitly while the existing Disable/Enable toggle archives and reactivates accounts.

## Login lifecycle errors

Archived and deactivated login attempts now return handled lifecycle errors so the login page can show relevant error toasts.

## Admin disable archives users

The Admin Users Disable/Enable control now archives or reactivates the target profile through the lifecycle flow while keeping token cleanup aligned with self-archive behavior.
