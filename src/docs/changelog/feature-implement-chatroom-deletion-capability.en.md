# Safer chatroom cleanup

**Feature Branch:** work

## Authorized chatroom deletion

Published a Messages capability that permanently deletes a chatroom and its dependent records when requested by the room owner or its only remaining participant.

## Correct user search filtering

Normalized the singular user result filter and applied it to registered and grouped results, so module search dialogs display users without unrelated local or API categories.

## Theme-aware search controls

Replaced the search popup's character close control and browser-provided input clear control with consistent SVG icons for light and dark themes. The input clear icon uses partial transparency to keep it visually subordinate.

## Commits

- [9f64c81](https://github.com/Cognis-Labs-HQ/Cognis/commit/9f64c81c94c94b711dc991451ed8d5a90ed1a189)
- [21df334](https://github.com/Cognis-Labs-HQ/Cognis/commit/21df334147bba7036d9b2fa7f3fa41585b928a89)
