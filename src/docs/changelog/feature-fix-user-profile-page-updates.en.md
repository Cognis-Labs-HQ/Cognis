# Live Profile Updates

**Feature Branch:** feature-fix-user-profile-page-updates

## Immediate profile details

Saved display names and other profile details now appear without refreshing the page.

## Reliable social updates

Follower and following totals now update with their corresponding user cards in real time.

## Single image prompt

Avatar and banner interactions now prevent duplicate selection prompts and overlapping uploads.

## Immediate social totals

Following and unfollowing now updates the visible profile totals and related social cards as soon as the request succeeds, without waiting for follow-up list requests.

## Immediate banner layout

Changing the profile banner height now repaints the banner before the preference save request finishes.

## Composer-wide live refresh

Page Composer refreshes now re-render existing cards by default, eliminating stale content across ordinary pages. Stateful meeting embeds continue to opt into DOM parking.

## Reliable component resources

The profile page now owns the messages used by its messaging actions instead of requesting resources from an independently disabled adapter. Browser-path checks now validate static and dynamic imports, served language paths, disabled-adapter boundaries, and relative paths within adapter UI packages.

## Profile cards stay interactive

Targeted profile updates now run through the page composer, preserving unrelated embedded media while restoring form and card interactions after a repaint.

## Follow totals update immediately

Following a viewed profile now adds the current account to the optimistic follower list before the server reconciliation completes.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/597aa63d6ef878eb2e40d6d8050a9956387fc0e8
