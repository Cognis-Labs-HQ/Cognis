# Per-user tracking for new Study Library content

**Feature Branch:** feature-update-external-package-contract-definitions

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

## Authoritative external package contract

The Study Library now validates and preserves localized and provider metadata, extensible declaratively validated field types, asset lists, package ownership and protection, semantic presentation, definition localization, interests, and activity compatibility. A synthetic package fixture mirrors a production provider structure, and the public provider capability can inspect a real pack without installing it.

## Library browsing and provider lifecycle fixes

Library search and edit controls now follow compact, theme-safe styling. Right-click selection is captured reliably, nested child cards retain hover hitboxes, and non-character cards show full readings and definitions without needless truncation. Content providers now authoritatively control language availability. Content records support namespaced classes, media lists survive ingestion, custom editors follow validation contracts, built-in constraints are enforced, and installation receipts retain provider metadata.

## Stable Library controls and balanced sentence cards

Sentence cards now use a consistent bounded height, omit redundant pronunciation previews, and clamp primary text and definitions to two lines. Search exposes one controlled clear action, edit icons render from explicit themed assets, deletion dialogs have localized labels, and vocabulary details include kana readings. Right-click selection is captured at the document boundary on every mounted Study page, while authoritative provider upgrades prune records omitted from the latest pack unless a partial pack explicitly opts out.

## Dedicated publishing-request navigation

Publishing reviews now live on a dedicated Requests page in Study sub-navigation instead of consuming Library page toolbar space. Reviewable pending requests give the Requests link a red breathing outline with a reduced-motion fallback, and the signal clears when the final review is resolved. The Library search clear icon now adapts to both light and dark themes.

## Language-scoped administration and guided card editing

The Library administrator now shows a flat layer menu for the selected language. Card classes are visible and safely editable, definitions and composites receive enforced classes, definitions stay learner-hidden, particles and provider-locked records cannot be edited, and edit dialogs provide clear View/Edit modes, Save actions, and unsaved-change protection. Card creation moved to a guided `+` page action on learner-facing layer pages, request status is available to submitters, popup title readings retain provider links, and Study language availability is refreshed on every page load.

## Reliable learner card actions

Learner cards now keep a selectable control regardless of deletion rights, so right-click reliably enters multi-select without opening the browser menu. Creation actions now discover provider-contributed card constructors and register the + control through the page-action CTX capability.

## Localized Requests navigation on first load

The Requests navigation item now receives localized fallback labels from its owning Library route, so a fresh server or browser load never exposes the internal `/study/library/requests` path while translation bundles are still loading.

## Ordered sequence relationship roles

Content-pack validation now reconstructs ordered sequence labels only from composition relationships. Pronunciation and alternate-spelling relationships can target lexical records and use their own position sequence without causing `ordered_sequence_content_unresolved`, matching the Japanese learning provider contract.

## Clear content-class and reverse-link details

Detail views now hide the structural composite class, humanize provider class suffixes into pills, and use a two-column composite heading with readings below the primary text. Same-label reverse vocabulary links are suppressed without removing the authored forward spelling relationship.

## Focused child-card branches

Opening a child-card branch now blurs unrelated cards’ visibility icons and neutralizes hover elevation and highlight styling on other parent cards. The active branch remains crisp and interactive.

## Safe same-owner schema evolution

New releases of an authoritative content pack can now revise their own stored schema at the same compatibility version. Ownership checks retain schema collision protection, and the schema cache updates only after transactional ingestion succeeds, allowing the latest Japanese pack to enable cleanly over its previous release.

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
- [617a2161](https://github.com/Cognis-Labs-HQ/Cognis/commit/617a2161)
- [365d5444](https://github.com/Cognis-Labs-HQ/Cognis/commit/365d5444)
- [11bec51d](https://github.com/Cognis-Labs-HQ/Cognis/commit/11bec51d)
- [b996336d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b996336d)
- [8d4c4129](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d4c4129)
- [d16a50d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d16a50d5)
- [ea24056d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea24056d)
- [bcb4e781](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcb4e781)
- [87f30e20](https://github.com/Cognis-Labs-HQ/Cognis/commit/87f30e20)
- [d3ba08ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3ba08ef)
