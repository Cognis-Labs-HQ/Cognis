# メッセージでプロフィールアバターを優先する

**機能ブランチ:** feature-prioritize-profile-picture-over-initials

## 概要

メッセージアダプターのアバター表示が、イニシャルより実際のプロフィール画像を
優先するようになりました。ソーシャルゲートウェイに新しい共有モジュールを追加し、
認証付きアバター取得とイニシャルフォールバックのロジックを集約することで、
ソーシャルアダプターのすべてのUI画面で再利用できるようにしました。

## 変更されたファイル・コンポーネント

- **`src/gateways/social/ui/reuse/profile-avatar.js`** _(新規)_ — `fetchProfileAvatarBlobUrl`、
  `isProfileAvatarUnavailable`、`buildProfileAvatarMarkup`、
  `hydrateProfileAvatars`、`handleProfileAvatarError` をエクスポートする共有モジュール。
- **`src/adapters/social/messages/ui/app.js`** — 重複していたアバターユーティリティを削除し、
  すべてのアバターレンダリングを共有ゲートウェイモジュールに委譲するよう変更。
- **`src/adapters/social/messages/routes.ts`** — `enrichMembersWithProfiles` が
  エンリッチされたメンバー形状に `avatarKey` を含むようになりました。
- **`src/adapters/social/profile/ui/navbar.js`** — ダッシュボードナビゲーションバーの
  アバタープロバイダーが共有モジュールの `fetchProfileAvatarBlobUrl` を使用するよう変更。
- **`src/adapters/social/messages/tests/bootstrap.test.ts`** — アバターフォールバックの
  回帰テストアサーションを新しい共有モジュールの場所を確認するよう更新。
- **`src/adapters/social/messages/tests/routes.test.ts`** — `GET /messages/rooms` が
  メンバーの `avatarKey` を返すことを検証するアサーションを追加。

## コミットリンク

- [9f78b06](https://github.com/Cognis-Labs-HQ/Cognis/commit/9f78b06)
- [5399b86](https://github.com/Cognis-Labs-HQ/Cognis/commit/5399b86)
