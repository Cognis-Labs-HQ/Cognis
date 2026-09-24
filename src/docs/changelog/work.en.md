# Study Library selection, request filtering, and safer audio authoring
**Feature Branch:** work

## Predictable multi-selection
Selecting every visible card now changes the floating action to Deselect All, and deselecting or leaving the SPA page cleanly exits multi-select mode.

## Focused request browsing
The Requests page now offers status and ownership filters, with the review queue shown only to administrators and teachers.

## Safer card authoring
Audio is optional and uploaded under a deterministic card-derived key, tag entry no longer submits forms, Cognis checkbox styling is applied, cancel actions use destructive styling, and character-layer records cannot be created or edited.

## Natural Library scrolling
Library surfaces now opt into the page composer's natural scrolling behavior.

## Guided composite-card designer
Composite cards now use ordered horizontal carousels for each relationship layer. Every carousel keeps its create action visible and can open a nested card composer, allowing authors to create a missing component and return without losing the parent draft. Free-text composition previews matching components and highlights unmatched text.

## Safe composition visibility and audio playback
The service now rejects composites whose referenced parts are not visible in the composite's destination. Invalid legacy audio placeholders no longer trigger failing audio requests.

## Reliable Select All toggle
Select All now has an explicit action state instead of inferring its click behavior from checkbox state. Its first activation selects every visible card and changes the action to Deselect All; only the latter exits multi-select mode. Visible-card detection now works in both learner cards and administration rows.

## Guided layer and unmatched-text creation
The creation flow now starts with a permitted card-type selector. Unmatched free text is actionable: choosing it opens the appropriate nested composer with the missing text already copied into the card label.

## Scope-aware editing and update review
Administration rows now open only the administration editor and retain their independent edit controls. Learner-facing detail dialogs show a top-right edit action only for eligible records: owners may edit their own cards, administrators may edit global cards, and protected provider content remains immutable. Author edits to globally published cards are stored as update requests and applied only after approval; Requests now identifies these separately and retains completed status history.

## Creation action availability
Every learner-facing non-character layer now contributes its create action, with a generic schema-driven constructor available when a provider does not supply a specialized constructor.

## Disabled language providers disappear immediately
Study now intersects saved learning-language preferences with the gateway's current enabled-provider registry before rendering settings, dashboard cards, search groups, or sub-pages. A disabled provider therefore disappears from both Active Languages and the Study dashboard without deleting the stored preference, so it returns naturally if an administrator enables the provider again.

## Commits
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504
- https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4
