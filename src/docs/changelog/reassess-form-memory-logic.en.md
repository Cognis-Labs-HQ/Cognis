# Form Memory Fixes

## Role dropdowns excluded from form memory

The Users page role selects are now excluded from the page composer's form draft memory. Previously, re-rendering the users table (e.g. after a role change failed and the composer refreshed) could restore stale role values from the draft store back into dropdowns, potentially masking the current server-side state.

## Per-room message draft persistence

The Messages composer now saves a draft per room, keyed by account and room ID. Typing in a room, switching to another room, and switching back restores the previous draft. Sending a message clears the draft for that room. This replaces the previous behaviour where text in the composer would persist across room switches regardless of which room it was intended for.

## Form draft memory is now opt-in

The page composer's persistent form draft storage has been inverted from an opt-out to an opt-in model. Only form fields whose closest ancestor carries `data-composer-include-form-memory="true"` are written to localStorage. Fields without an opted-in ancestor are still captured in the transient in-memory snapshot so they survive responsive re-renders within the same browser session, but they are never written to persistent storage. This prevents server-driven controls (role dropdowns, toggle switches, preference selects) from ever being cached client-side.
