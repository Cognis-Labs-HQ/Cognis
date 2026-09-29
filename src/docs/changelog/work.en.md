# Stable Child Card Navigation

**Feature Branch:** work

## Stable Child Positions

Child cards preserve their fitted positions while deeper branches open. New descendants are placed by depth into visible free slots with collision clearance, preventing cards and connectors from jumping or overlapping.

## Reliable Pointer Navigation

Diagonal routes now have a larger continuous hit corridor, branch changes use a short hover-intent delay, and active cards no longer pulse. Direction fallback ordering also keeps initial child layouts compact around their preferred axis.

## Unified Composition Carousels

Input and pronunciation now use the same reusable token input and carousel rendering. Input carousels sit directly under their field, selected tokens share the compact contained remove button, and dependency creation controls appear only for layers that users can normally create.

## Immediate Dependency Composition

Cards created from a carousel’s add control now return through the same selection path as existing cards, so they are immediately added to the active stage. Alternate-character pronunciation fields now include their atomic-character carousel even when the provider relationship uses a broader presentation role.

## Stroke Lookup and Guided Validation

Stroke-capable composers now place field-aware lookup actions under a dedicated Stroke Pattern heading and draw loaded data in a compact preview. Required relationship validation now marks affected tabs, opens the tab containing the earliest invalid field, and focuses the field or definition action that needs attention.

## Aligned Popup Title Details

Popup definitions no longer carry a leading em dash. Pronunciation and definition groups now share the primary title row and are vertically centered against the card title.

## Commits

- [ccbab39b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ccbab39b)
- [db0728af](https://github.com/Cognis-Labs-HQ/Cognis/commit/db0728af)
- [9c77e48f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c77e48f)
- [41d895c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/41d895c6)
- [e5f1dd4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/e5f1dd4b)
- [ed27aee1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed27aee1)
