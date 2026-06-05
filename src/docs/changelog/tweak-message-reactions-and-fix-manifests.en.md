# Reaction Persistence & Emojis

## Summary

Tweaked message reactions to always remain visible when a message has received reactions, while the quick reaction picker still disappears on hover-out. Dramatically expanded the available emoji set via a new raw emoji data file in the social gateway. The quick reaction strip now shows five emojis that adapt over time to the user's most-used picks, with a "···" overflow button that opens a searchable full emoji picker.

Emoji usage is now tracked per user in the database instead of localStorage. A new `chat_emoji_usage` table stores each user's pick counts and is queried at page load to populate the adaptive quick-reaction strip. The five quick-reaction slots no longer have hardcoded fallback emojis — when a user has no recorded history, the strip is seeded from the first entries in the emoji catalog.

All emoji names in the catalog are now localization keys resolved through the Social Gateway's strings files in English, German, Indonesian, and Japanese. The picker search and button tooltips display translated names.

## Changed Files and Components

- `src/gateways/social/ui/emojis.json` — emoji names changed to i18n keys
- `src/gateways/social/ui/languages/*/strings.xml` — new Social Gateway language files with 366 translated emoji names
- `src/adapters/social/messages/store.ts` — new `chat_emoji_usage` table; `incrementEmojiUsage` and `getTopEmojiUsage` methods
- `src/adapters/social/messages/routes.ts` — new `GET/POST /api/v1/social/messages/emoji-usage` routes; adaptive quick-emoji system, full emoji picker popup, reaction row persistence
- `src/adapters/social/messages/ui/app.js` — server-backed emoji usage, i18n emoji name resolution, no hardcoded defaults
- `src/adapters/social/messages/ui/messages.css` — CSS split: chips always-visible when present, add-wrap hover-only, emoji picker styles
- `src/adapters/social/messages/ui/languages/en/strings.xml` — new i18n keys: emoji_more, emoji_search_placeholder
- `src/adapters/social/messages/ui/languages/de/strings.xml` — German translations
- `src/adapters/social/messages/ui/languages/id/strings.xml` — Indonesian translations
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — Japanese translations
- `src/adapters/social/messages/tests/store.test.ts` — tests for emoji usage schema and methods
- `src/adapters/social/messages/manifest.json` — version bump 1.4.0 → 1.4.1

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/2a9c702
- https://github.com/le-firehawk/Cognis/commit/295496e
- https://github.com/le-firehawk/Cognis/commit/1e40511
- https://github.com/le-firehawk/Cognis/commit/e19669d
