# Instant Profile Feedback

## Immediate social totals

Following and unfollowing now updates the visible profile totals and related social cards as soon as the request succeeds, without waiting for follow-up list requests.

## Immediate banner layout

Changing the profile banner height now repaints the banner before the preference save request finishes.

## Composer-wide live refresh

Page Composer refreshes now re-render existing cards by default, eliminating stale content across ordinary pages. Stateful meeting embeds continue to opt into DOM parking.

## Reliable component resources

The profile page now owns the messages used by its messaging actions instead of requesting resources from an independently disabled adapter. Browser-path checks now validate static and dynamic imports, served language paths, disabled-adapter boundaries, and relative paths within adapter UI packages.
