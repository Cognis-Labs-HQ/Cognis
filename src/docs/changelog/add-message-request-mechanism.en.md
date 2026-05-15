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
