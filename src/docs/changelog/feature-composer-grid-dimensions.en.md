# Composer Grid Dimensions

**Feature Branch:** feature-composer-grid-dimensions

## Consistent Full Width

Full-width array declarations now use every available column in main and nested composers, including the login and registration form layouts. Numeric height limits and fill-height behavior remain independent.

## Drag Beyond the Grid

Dragging a widget below the current grid expands the content, overlay and shaded drop target together. The new extent remains available until the widget is dropped.

## Accurate Previews and Room for Controls

Drag previews and resize handles now use the same gap-aware dimensions as rendered cards, including half-grid placements. Editor measurements account for content padding and scrollbar space. The Elements panel uses available width so its action labels remain readable on desktop, tablet and mobile screens. Panel positioning measures width after applying the height limit, including any internal scrollbar. Yellow previews show the legal upward snap destination before release. Dropping applies that destination immediately while editing remains open, and snapping never crosses another occupied card.

## Stable Touch Layout Editing

Widgets retain the point where they were grabbed instead of jumping under the pointer. Main and nested editors support edge scrolling, pointer cancellation and touch resize targets. The Elements panel sizes to its content and minimizes to its header to free editing space. Saving keeps the editor active until persistence succeeds, including during viewport changes.

## Accurate Resize Controls

Element removal now uses the shared cancel-button appearance. Resize handles check size limits, grid boundaries and neighbouring tiles. They remain available for legal shrinking when expansion is blocked, with directional cursors showing the available moves. Attempts to expand into another tile show an unavailable cursor. Attempting to pass a minimum, maximum or grid-origin limit turns the preview orange. Horizontal, vertical and corner gestures report limit crossings independently while candidate dimensions remain bounded.

## Resize from Every Edge and Confirm Saves

Widgets can now resize from all eight edges and corners in main and nested editors. Left and top resizing retain the opposite edge, respect size and collision limits, and keep touch previews aligned with the grabbed point. Done and the layout shortcut show localized success or failure notifications through one shared save flow. Reset Layout only stages default placements and visibility in the open editor; Done commits them and Discard restores the pre-edit layout. Reset does not write preferences or advance the discard snapshot. Failed writes preserve pending edits for retry; repeated saves share a request and page cancellation prevents late feedback. Save failures use concise localized notices.

## Editor Helper Contracts

Reusable editor modules document their public exports, call examples, input/output contracts and cleanup responsibilities. The Technical reference covers save results, editor state and the actual per-column persistence payload in all four supported languages.

## Comfortable Workspace Defaults

Dashboard branding has room for its icon and full title, welcome and login cards retain readable widths, and account details use a compact default height. Composer applies current minimum and maximum widths when a saved row requires repacking, keeping visible cards within their bounds without overwriting stored profiles. Normalized placements are validated before rendering, so a widened saved card at the right edge is repacked within the declared grid. Explicit saved widths, heights and gaps are retained in main and nested grids for their column profile. Done persists the displayed geometry without a final packing or width-redistribution pass. Stable scrollbar gutters keep edit and view column selection consistent.

## Collision-Safe Widget Exchanges

Main and nested editors preserve both widget sizes when exchanging them. Horizontal leapfrogs retain the pair’s outer edges and intervening gap, allowing adjacent equal-height elements with different widths to exchange in either direction. Different heights are allowed when both complete destinations clear every other visible element, including vertical neighbours. Rectangle intersection checks depend on placement count rather than occupied grid area. Both destinations are checked for mutual overlap and grid bounds; release revalidates live geometry before changing either position. The same themed dropzone line is green for a valid exchange and red when blocked. Mouse, touch and keyboard use the shared model. Nested edge scrolling retains provisional grid height and remeasures previews after growth changes ancestor scrolling.

## Descriptive Runtime Bindings

Syntax-tree naming validation scans JavaScript and TypeScript source, tooling, tests and fixtures without baselines or per-file exemptions. It checks runtime bindings, signature labels, private members, owned composite type names and methods. Conventional short forms remain valid as direct names such as `db`, `this.db`, `args` and LDAP `dn`. Composites expand non-unit abbreviations, including names inherited from upstream: `DatabaseExecutor`, `KeyringDatabaseExecutor`, `createDatabaseExecutor`, `baseDistinguishedName` and `registerStaticDirectory`. Opaque shorthand, numbered placeholders and consumed ignored bindings fail validation. Unused, unexported `_`, `id` and arithmetic `i`/`j`/`k` counters retain their defined roles; generic type parameters, canonical dependency/platform names and public payload keys retain their contracts. Owned API declarations, imports, exports and callers use one consistent name; naming-only aliases, including type aliases, fail validation. Regression fixtures protect the direct/composite distinction and canonical platform APIs. Localized technical manuals, contributor guidance, component versions, dependency ceilings, lockfiles and version indexes are synchronized. Measurement-unit tokens such as `ms`, `sec`, `px`, `rad` and `deg` stay abbreviated inside composites; timing and pixel expansions are restored to forms such as `INVITE_EXPIRY_MS`, `timeoutMs` and `widthPx`. Regression fixtures enforce the unit exception without admitting opaque neighboring words.

## Commits

- [42d72de](https://github.com/Cognis-Labs-HQ/Cognis/commit/42d72de61ab7765abe866b3fd3a0214bcfb2b006)
- [e025238](https://github.com/Cognis-Labs-HQ/Cognis/commit/e025238e3c4bab7a938cd2b6de30728c6495e30b)
- [6756c5f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6756c5fadd4cd220aa045a063cb9c5fd0237269a)
- [cb2952d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cb2952d3be976a2bdb224022153b5f34aec0c434)
- [fcc204f](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcc204fe09b8fa86814d5f24b5d3839dfbc51c2b)
- [286d397](https://github.com/Cognis-Labs-HQ/Cognis/commit/286d397650ef4e285375d95201a7eee6c70b6528)
- [f038150](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03815014aee59973f68dc3f040c2bf248309f9e)
- [fc698c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc698c84645f30eabbc25306ecf3eccbbb3b8828)
- [ba219ba](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba219ba88b792c7535934b4dd5e78e93ba601777)
- [935c670](https://github.com/Cognis-Labs-HQ/Cognis/commit/935c670f7a9447e83355662c8facfbfd090255fa)
- [244aff5](https://github.com/Cognis-Labs-HQ/Cognis/commit/244aff5f4fca07e76c4c484cec5df292116f7293)
- [edb18fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/edb18fe66f9a1862b646b5139448c6b2808b5414)
- [6769fc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/6769fc72c6ee94e2aa5d7972e755499abde402ed)
- [62bba8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/62bba8d9866310444eca76beb41585951f44e34a)
- [310f0eb](https://github.com/Cognis-Labs-HQ/Cognis/commit/310f0eb513d74910fbb076d37b1aa8e2dbe12f3c)
- [0afbb90](https://github.com/Cognis-Labs-HQ/Cognis/commit/0afbb90055f7b2c8d2689fb3d6b0664e92e6fb91)
- [e176689](https://github.com/Cognis-Labs-HQ/Cognis/commit/e176689a44f4c88df0e7347a08b21e64265fdc72)
- [e53aa55](https://github.com/Cognis-Labs-HQ/Cognis/commit/e53aa55819218477adbecee70dda4105c92f106f)
- [9a8a116](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a8a116087bd2051c0d269df6ce951d72e302faa)
