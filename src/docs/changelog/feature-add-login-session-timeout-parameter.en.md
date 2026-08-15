# Configurable login session lifetimes

## Administrators control the maximum session duration

Administration → Security now provides the default and maximum login-session timeout.

## Users may choose a shorter session

Each user can select a shorter timeout in Settings → Security. Newly issued login tokens use that persisted preference and remain valid across application and database restarts.

## Choose a time unit

Login session timeout controls now accept minutes, hours, days, or weeks instead of requiring minute conversion.

## Allow sessions without a timeout

Administrators can select Never to disable session expiry, with a clear warning that this setting is not recommended in production.

## Organize the security settings

User Security settings now show Login Session Timeout as a distinct subsection, matching its organization in Administration.

## Track timeout changes reliably

Session timeout fields now participate in unsaved-change tracking in both Administration and User Settings. User Settings also separates the password action and timeout heading with consistent section spacing.

## Preserve user choices and report expiry

Compatible Administration timeout updates now leave each saved user duration unchanged; temporary lower limits cap it without overwriting it. Expired API sessions immediately return users to Login and display the existing session-expired message.

## Reset to the global timeout

User Settings now provides an undo-icon button beside the duration unit. Resetting removes the custom duration behavior so the session timeout follows current and future Administration defaults.

## Apply timeout changes securely

Never now hides the numeric field and saves without validation errors. User Settings displays a disabled Never choice when expiry is globally disabled. Saving or resetting a personal timeout revokes every existing session for that user.

## Refresh the global timeout on reset

The reset control is now always available. Each click reloads the latest Administration timeout and stages an update only when the effective value or default-following state differs.

## Preserve Never during login

Authentication bootstrap now preserves the stored zero-minute global timeout instead of replacing it with the 12-hour fallback, so synced users receive non-expiring sessions.
