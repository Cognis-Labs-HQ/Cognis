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
