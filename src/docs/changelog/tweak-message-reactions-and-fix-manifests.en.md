# Reaction Persistence & Emojis

## Summary

Tweaked message reactions to always remain visible when a message has received reactions, while the quick reaction picker still disappears on hover-out. Dramatically expanded the available emoji set via a new raw emoji data file in the social gateway. The quick reaction strip now shows five emojis that adapt over time to the user's most-used picks, with a "···" overflow button that opens a searchable full emoji picker. Version numbers for the social-messages adapter manifest were also bumped.

## Changed Files and Components

- `src/gateways/social/ui/emojis.json` — new comprehensive emoji data file (300+ emojis) served as a static gateway asset
- `src/adapters/social/messages/ui/app.js` — adaptive quick-emoji system, emoji usage tracking, full emoji picker popup, reaction row persistence
- `src/adapters/social/messages/ui/messages.css` — CSS split: chips always-visible when present, add-wrap hover-only, emoji picker styles
- `src/adapters/social/messages/ui/languages/en/strings.xml` — new i18n keys: emoji_more, emoji_search_placeholder
- `src/adapters/social/messages/ui/languages/de/strings.xml` — German translations
- `src/adapters/social/messages/ui/languages/id/strings.xml` — Indonesian translations
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — Japanese translations
- `src/adapters/social/messages/manifest.json` — version bump 1.4.0 → 1.4.1

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/2a9c702
