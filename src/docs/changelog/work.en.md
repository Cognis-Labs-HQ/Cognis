# Consistent profile avatars

## One profile-owned avatar source

Profile avatar loading, fallback rendering, initials generation, and initials colours now come from the Profile adapter's UI CTX capability. Shared UI callers delegate to that capability instead of maintaining competing implementations, so names produce the same avatar everywhere.
