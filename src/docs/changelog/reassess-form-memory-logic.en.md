# Form Memory Fixes for Users and Messages

## Role dropdowns excluded from form memory

The Users page role selects are now excluded from the page composer's form draft memory. Previously, re-rendering the users table (e.g. after a role change failed and the composer refreshed) could restore stale role values from the draft store back into dropdowns, potentially masking the current server-side state.

## Per-room message draft persistence

The Messages composer now saves a draft per room, keyed by account and room ID. Typing in a room, switching to another room, and switching back restores the previous draft. Sending a message clears the draft for that room. This replaces the previous behaviour where text in the composer would persist across room switches regardless of which room it was intended for.
