# Password Change Hardening

## Require Current Password Validation

Password changes in User Settings now always require the current password and validate it server-side before accepting a new password.

## Block Password Reuse

Local auth now stores hashed password history and rejects password changes when the new password matches any previously used password hash.

## Rename Reset To Change

The Security settings UI now uses “Change Password” instead of “Reset Password” for the section title, action button, and popup title.
