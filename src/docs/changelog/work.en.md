# Per-user tracking for new Study Library content

**Feature Branch:** work

## Persistent viewed-content cache

Cognis now stores viewed Library entry UUIDs per account. Hovering a card or opening it directly or through a relationship marks it as viewed without exposing another user's history.

## New-content indicators and notifications

Unviewed entries display a one-time **New** pill in previews and detail popups. Provider updates and approved global contributions notify enabled users when new language content becomes available.

## Scoped contributions and review workflows

Users can create personal cards, teachers can also create cards in their own classes, and administrators can create global cards. Promotion requests now move approved cards to teacher-owned classes or the global collection, while authorized downgrades return them to the original submitter. Provider-protected cards cannot be moved or deleted.

## Searchable and configurable Library UI

Language providers can shape layer-owned creation fields through a ctx capability. Global duplicate detection pauses creation for confirmation, imported records carry a persistent search index, Library search spans every layer, optional preview definitions render below card content, and multi-select controls now occupy the requested card-edge positions with restored floating actions.

## Language-defined creation is complete

Language packs can now declare a validated `cardConstructor` for each creatable layer, or register one through the public `study:library:provider` ctx capability. Cognis composes the provider fields with role-aware visibility and class controls, shows class selection only when needed, and exposes review requests to authorized teachers as well as administrators.

## Bounded card status and contextual publishing

Card-edge scope, New, and selection controls now stay within each card’s horizontal bounds, while constrained previews reserve most space for their primary value. Multi-select now offers a hoverable Publish to menu, a real localized delete label, pending-request withdrawal, and authorized send-back actions without a redundant close button.

## Concise links and smarter discovery

Related-item controls now show only each card's primary value. Child cards have clearer surfaces, stronger background separation, and independently hoverable New markers. Detail popups suggest similar same-layer items using writing, vocabulary metadata, and shared relationships, while language providers can expose additional metadata fields as learner-facing filters.

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
