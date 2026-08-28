# Account Safety

**Feature Branch:** feature-add-danger-zone-section-in-settings

## Added Settings Danger Zone

Users can now archive, deactivate, or delete their own account from General settings after confirming a warning dialog with their password. Deactivated profiles reactivate on next login, archived profiles show a warning banner and block interactions until an administrator restores them, and deleted accounts are removed permanently.

## Clearer lifecycle controls

Danger-zone account actions now use consistent cancel-styled buttons, deactivation warning copy no longer says administrator intervention is required, and confirmation popups submit when Enter is pressed.

## Admin status clarity

The Users page now shows archived and deactivated account states explicitly while the existing Disable/Enable toggle archives and reactivates accounts.

## Login lifecycle errors

Archived login attempts now return handled lifecycle errors, while deactivated accounts reactivate when the user logs in again.

## Admin disable archives users

The Admin Users Disable/Enable control now archives or reactivates the target profile through the lifecycle flow while keeping token cleanup aligned with self-archive behavior.

## Deactivation hibernates accounts

Self-deactivation now hides accounts from interaction while letting users restore access by logging in again, and the danger-zone popup uses neutral cancel styling.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/84934f6b7a14135551c11da59c8fc51f014b7be4
