# PRの変更履歴 — API権限チェックの一元化

## 概要

`owner`ロールがユーザースコープのAPIエンドポイントにアクセスできないバグを修正しました。
ルートハンドラーがランクベースの比較ではなく`role === "admin"`の文字列完全一致を
使用していたことが原因です。ロール階層では`owner`が`admin`より上位であるため、
`GET /api/v1/users/:id/emails`などのエンドポイントでオーナーが誤って403を返していました。

`src/gateways/auth/guard.ts`に2つの再利用可能なヘルパー関数を追加しました。

- `hasMinRole(role, minRole)` — 指定されたロールが最小ランク以上であるかを返します。
  正規の階層`user < teacher < moderator < admin < owner`を使用します。
- `canAccessUserData(claims, targetUsername)` — 呼び出し元が対象ユーザー自身であるか、
  または少なくともadminランクを持つ場合に`true`を返します。

両ヘルパーは`src/gateways/shared.ts`経由でゲートウェイ開発者向けに再エクスポートされます。
`"admin"`または`"owner"`に対してアドホックな文字列比較を行っていたすべてのルートハンドラーが
これらのヘルパーを使用するように更新されました。

## 変更されたコンポーネントとファイル

- Authガード（新しいヘルパー関数）:
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- 通知ゲートウェイルート（オーナーアクセス修正）:
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
- ユーザールート（一貫性の更新）:
    - `src/api/routes/users/index.ts`
- プロフィールアダプタールート（オーナーアクセス修正と一貫性向上）:
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/posts.ts`
- テスト（オーナーアクセスの新しいカバレッジ）:
    - `src/gateways/notify/tests/email-routes.test.ts`
    - `src/gateways/notify/routes/tests/notification-routes.test.ts`
