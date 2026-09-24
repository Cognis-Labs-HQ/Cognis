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

## Commits
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
