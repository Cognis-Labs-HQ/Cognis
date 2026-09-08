# Compact Study Library layers

**Feature Branch:** work

## Minimal layer presentation

Library schemas can opt individual layers into compact cards that show only the entry's primary content. Clicking, right-click selection, long-press variant disclosure, and revealed child cards continue to use the existing interaction model.

## Preference-relative popup typography

Detail popups now establish their typography from the user-selected application font size, with proportional heading levels instead of an oversized fixed Library heading. External modules using absolute CSS font sizes fail boundary validation before activation.

## Remove phantom Library overflow

Hidden directional variant cards no longer participate in scrollable overflow. They are removed from layout until deliberately revealed, eliminating the empty card-width region and horizontal scrollbar while retaining long-press and deep-link disclosure.

## Consistent Library controls and validated sentences

Logout now retains only its red cancel hover treatment. Minimal cards keep pronunciation and localized definition context beside the primary value, while detail titles and audio failures use corrected relative sizing. Content-pack ingestion rejects ordered sentences containing text that is not backed by linked lexical-unit or particle entries.

## Redirect unavailable Study routes

Study SPA routes are now advertised only while at least one valid, enabled language module exists. Direct requests and cached SPA mounts redirect to `/error?code=503` when language validation leaves Study unavailable, rather than rendering an empty or broken Study shell.

## Content-sized minimal cards and stronger popup titles

Minimal Library grids continue to allocate the module-requested number of equal columns, including blank positions, while visible cards now shrink to their content plus padding and stay centered within each scaled grid slot. Popup titles are doubled in size and title details are thirty percent larger.

## Unified Library card details

Every Library layer now presents definitions through the shared popup title-detail structure, places scope beside the title, uses standard close controls and SVG navigation icons, and previews linked definitions consistently. Directional variants at grid edges fall back upward instead of overlapping the next or previous row.

## Complete compositions and stable Study navigation

Library composition references now merge by presentation role and preserve their declared positions, so particles remain in the same complete composition instead of appearing beneath a duplicate heading. Study sub-navigation folding now uses a header-height-aware hysteresis threshold that prevents layout-induced scroll changes from rapidly reopening and closing the primary navigation.

## Commits

- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
- [a6bb913b](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6bb913bf18284dd5bd7f172994ec41fdacb78d6)
- [8ec16aee](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ec16aee27bb9ba6e4d3b1461d30bb9b1003020f)
- [c7a41d2c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7a41d2c3933afa6502a7633b1f6089c816e7c8e)
- [c2b80b54](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2b80b5468ee6acfcb2e525fcdbcfd6df7865f5d)
