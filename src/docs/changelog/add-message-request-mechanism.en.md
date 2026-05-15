# PR Changelog — Add Message Request Mechanism

## Summary

Fixed the profile message-button flow so clicking it now always performs an
action: it opens an existing direct room, creates a direct room, or sends a
message request when direct messaging is not yet allowed.

Added message requests as a first-class conversation-start path for users who
do not mutually follow each other, while preserving direct room creation for
mutual followers.

Added message read receipts, typing notifications, and emoji reaction toggles
to the messages API and UI.

Refined messages pane layout: reduced wasted vertical space, fixed y-overflow
so the composer is always fully visible, moved timestamps inside message bubbles
as `HH:MM`, added date-divider chips between messages from different dates,
fixed emoji reaction deduplication, and added a leave-room icon in the thread
header.

Replaced the tick/double-tick read receipt system with an avatar-based design.
Sent messages now show a small outline circle until the server confirms
delivery, a filled circle once delivered, and the reader's avatar once the
message has been read. Group chats show multiple reader avatars side-by-side.
Emoji reaction tooltips now show a single descriptive word ("Like", "Heart",
"Haha", "Celebrate") instead of the raw emoji character.

## Changed components and files

- Social messages adapter:
    - `src/adapters/social/messages/store.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/messages.css`
    - `src/adapters/social/messages/tests/routes.test.ts`
    - `src/adapters/social/messages/tests/store.test.ts`
    - `src/adapters/social/messages/docs/standard.en.md`
    - `src/adapters/social/messages/package.json`
- Social profile adapter:
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/package.json`
- Localization:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Version index:
    - `src/docs/versions.en.md`

## Commits

- [d4f7f6d](https://github.com/le-firehawk/Cognis/commit/d4f7f6d)
- [fc3febe](https://github.com/le-firehawk/Cognis/commit/fc3febe)
- [11eebfa](https://github.com/le-firehawk/Cognis/commit/11eebfa)
- [2db27c2](https://github.com/le-firehawk/Cognis/commit/2db27c2)
- [f08f248](https://github.com/le-firehawk/Cognis/commit/f08f248ea1b20fef4b7e5452e19a2857ed4b785e)
