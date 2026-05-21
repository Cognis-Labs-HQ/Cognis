# Auth and Password Policy

## Removed duplicate auth providers widget from Administration

The auth providers widget card has been removed from the Authentication section of Administration, since it already appears on the Components page. The Authentication admin section has been dropped entirely.

## Password policy moved to Administration → Security

The password policy configuration widget has moved from the old Authentication admin section into the Security section of Administration. It now integrates with the standard dirty-state tracker, so changes are saved or discarded via the unified changes bar rather than a dedicated Save button.

## Password policy uses numeric minimums for character classes

The uppercase letter, digit, and special character requirements now use numeric inputs instead of toggle switches. Setting the value to 0 (the default) disables the requirement; any positive integer sets the minimum count of that character class required in passwords.

## Registration page: inline username validation

The registration form now shows an inline warning beneath the username field as soon as the user types a character that is not a printable ASCII character or that is uppercase. The warning appears immediately on input rather than only at form submission.

## Registration page: always-visible password policy dotpoints

The password field on the registration page now shows all applicable policy requirements as a persistent bullet-point list below the field. Each dotpoint updates live as the user types, turning green with a checkmark when the requirement is met and red when it is not, so users can see exactly what remains before submitting.

## Form builder utility for structured criteria

A new reusable form builder utility now drives register-form rendering and validation using structured field and criterion definitions passed through a shared context (`ctx`). This establishes a reusable pattern for future forms to declare validation criteria in data rather than hardcoded per-field DOM logic.

## Username limit now warns instead of blocking input

The username input no longer hard-stops at 25 characters. Users can keep typing, and an inline validation warning appears as soon as the value goes beyond 25 characters.

## Required fields show red asterisk next to field label

Required fields now display a red asterisk directly beside the field title label rather than below the input. The asterisk uses theme-aware danger colour so it is clearly readable in both light and dark themes.

## Username criteria shown in focus-activated floating panel

Username requirements are now displayed in the same floating panel format as password criteria. The panel appears directly below the username field when that field is focused and hides when focus leaves, keeping the form uncluttered when not interacting with that field.

## Password and username criteria panels track field width

The floating criteria panels now snap directly under their respective input fields and match the full width of the field rather than floating to the right edge. On mobile the panel falls inline below the field when focused.

## Criteria panels use correct theme colours

The floating criteria panels now use the correct CSS theme variables (`--surface`, `--border`, `--text-muted`, `--color-success-outline-text`, `--color-danger-outline-text`) so colours are accurate and readable in both light and dark themes.

## Username restricted to letters, digits, hyphens, and underscores

Username validation now only accepts alphanumeric characters, hyphens, and underscores. Special characters such as `!@#$%^&*()` are no longer permitted. The validation message updates accordingly.

## Criteria rows show full-line colour with prominent icons

Each validation criterion row now highlights its full background in green when satisfied and red when unmet, replacing the previous plain-text colour change. The status icons are upgraded to a heavy check mark (✔) and heavy ballot X (✘) for clear at-a-glance feedback.

## Password confirmation mismatch only shown when a value is entered

The confirm-password mismatch error no longer shows prematurely. It remains neutral until the user types into the confirm password field, preventing false-failure indicators when the field is still empty.

## Password match criterion timing

The password confirmation criterion now stays neutral until text is entered in the password field. This prevents the match check from showing early while the primary password is still empty.

## Reactive confirmation mismatch state

The confirm-password field now revalidates immediately when either password input changes, so mismatch state turns red as the user types.

## Positive criterion wording

The confirmation criterion label now uses “Passwords match.” so the same line reads naturally in both success and failure states via green/red criterion styling.

## Confirm Password Empty-State Fix

Fixed register password confirmation criteria so an empty confirmation value is no longer treated as matched when the main password already has input.
