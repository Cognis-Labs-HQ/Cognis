# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                                 | Guide                  | Access         |
| ---------------------------------------------- | ---------------------- | -------------- |
| `^/study/explore(?:/\|$)`                      | Explore The Library    | Signed-in user |
| `^/study/library/search(?:/\|$)`               | Dictionary Search      | Signed-in user |
| `^/study/(?:library/)?requests(?:/\|$)`        | Library Requests       | Signed-in user |
| `^/study/library(?:/\|$)` · `.library-browser` | Library Administration | Administrator  |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

`scope` bounds targets and discovery. Optional `visibleWhen` requires a unique visible element without restricting targets to its descendants; targets still stay inside the component root. Library Administration uses this for its browser visibility while highlighting sidebar search. Invalid selectors fail registration and roll back the owner.

Explore begins with the layers sidebar, filters and a stable favourite example. Clicking the selected card opens a conditional detail branch; Next skips it. Details and optional writing controls have distinct highlights inside the owned popup, which closes when the branch ends.

The favourite and detail steps share one stable card container, including on Alphabet pages and after grid reordering.

## Language Variants And Branches

The provider publishes `study:libraryTutorials` version 1 through scoped actions. Modules call `register({ owner, id, language, titleKey, text, stringsBaseUrls, signal })` with their stable identity, language and localized stage text overrides. Registration returns `{ id, dispose }`. Library owns selectors, card actions, route selection and popup lifetimes; modules import no Library implementation. Duplicate language registration fails, and owner removal restores the generic Explore guide.

Only explicitly enrolled languages receive module guides. On `/study` they are manual choices; on the matching Explore view the language variant replaces generic Explore. Merely registering or discovering a guide never navigates. An intentional overview launch opens the language's content; an existing Explore layer remains selected. The creation branch can move from a character-only layer to a layer where users can create cards.

The walkthrough covers layers, filters, one stable favourite/card example, its detail popup, available pronunciation audio, writing practice and drawing controls. Clicking the card or Draw opens its branch; Next bypasses unopened branches. Back from the canvas returns to the card opener because Draw closes the detail popup.

Create opens the real card-type chooser, then the real content editor, its tabs and save controls. Users can explore these tools without saving. The guide never submits a card. Popup and drawing lifetimes follow the branch; Back, Restart, completion and removal release them, retaining unsaved-change confirmation.

Search results, requests and Library administration omit record-specific steps when there are no visible records. Their overview controls remain available without waiting for absent targets.

The Library-owned trigger step calls the scoped `bindOpening({ target, signal: groupSignal })` action before enabling the card click. Library interactions capture `openingSignal(target, pageSignal)` before their first asynchronous operation. That signal guards detail retrieval and composition and is passed to the popup API, including its asynchronous preparation. Aborted openings release the detail lock immediately, suppress cancellation feedback and cannot clear a newer attempt. Ordinary openings retain their page signal. The capability owns these bindings so bundled and direct scripts share the same lifetime state.
