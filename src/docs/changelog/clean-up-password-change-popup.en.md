# Password Change Hardening

**Feature Branch:** copilot/clean-up-password-change-popup

## Require Current Password Validation

Password changes in User Settings now always require the current password and validate it server-side before accepting a new password.

## Block Password Reuse

Local auth now stores hashed password history and rejects password changes when the new password matches any previously used password hash.

## Rename Reset To Change

The Security settings UI now uses “Change Password” instead of “Reset Password” for the section title, action button, and popup title.

## Fix Verification And Migration Edge Cases

Current-password input now preserves surrounding whitespace during verification, migrated accounts backfill the pre-rotation hash into history before updates, legacy two-argument auth adapters remain compatible, and password-history retention is bounded consistently across DB and volatile stores.

## Commits

- [926f513](https://github.com/Cognis-Labs-HQ/Cognis/commit/926f513f10cade5b1e5f9367c98276b2898b4bc2)
