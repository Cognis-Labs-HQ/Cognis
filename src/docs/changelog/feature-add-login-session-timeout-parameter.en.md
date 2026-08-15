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
