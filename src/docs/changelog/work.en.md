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

## Commits

- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
