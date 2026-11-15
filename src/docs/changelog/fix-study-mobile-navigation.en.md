# Study Mobile Navigation

**Feature Branch:** fix-study-mobile-navigation

## Compact Study Controls

Primary navigation uses a menu icon. Study page links stay on one horizontally scrollable row, with the active link revealed after resizing or font changes. Language, dictionary search and settings share a second row. On small screens, dictionary search opens a dialog that retains the original form and draft, restores focus, and closes on navigation or a desktop resize.

## Clean Study Pages

Study cards fit narrow columns and the overview uses natural document scrolling. While scrolling compact Study pages, the brand row yields space while primary navigation remains accessible. The Flashcards alias renders the selected language without waiting on navigation into its own loading module. Tutorial dictionary targets follow the visible control.

## Narrow Forms and Filters

Study browsing controls wrap within narrow content columns. Login and registration branding and form inputs shrink within the available width, including 253px viewports.

## Safe Browser Test Inputs

Chromium tests pass credentials, selectors and navigation inputs as structured protocol arguments rather than constructing JavaScript from those values. Regression coverage includes hostile text, direct and SPA navigation, populated Study pages, phone and tablet orientations, and desktop layouts. External module implementation remains outside this change.

## Commits

- [d1b5fe1ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1b5fe1ac497bc516a04d1f06717007512a6a40e)
- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
