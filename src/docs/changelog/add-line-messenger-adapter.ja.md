# PR 変更履歴 — LINE Messenger アダプター追加

## 要約

認証ゲートウェイ向けに新しい `line` 認証アダプターを追加しました。

LINE Login の Authorization Code フローを実装し、モバイルユーザー向け
PKCE 対応（LINE アプリへのハンドオフを含む）、プロフィール取得、
ID トークン検証に対応しました。

Auth ログインに外部 ID のライフサイクル同期を追加しました。初回外部ログイン
時のアカウント作成、表示名とプロフィール画像 URL のライブ同期、そして
`active` / `unlinked` / `deactivated` / `deleted` 状態の適用を行います。

さらに、プロバイダー ID の解除ルート
`POST /api/v1/auth/providers/:provider/unlink` を追加しました。これにより
ID を `unlinked` として記録し、アカウントを無効化し、トークンを失効します。

## 変更されたコンポーネント/ファイル

- 認証ゲートウェイ:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
- 新しい LINE 認証アダプター:
    - `src/adapters/auth/line/index.ts`
    - `src/adapters/auth/line/tests/line-adapter.test.ts`
    - `src/adapters/auth/line/package.json`
    - `src/adapters/auth/line/manifest.json`
    - `src/adapters/auth/line/tsconfig.json`
    - `src/adapters/auth/line/docs/index.en.md`
    - `src/adapters/auth/line/docs/index.de.md`
    - `src/adapters/auth/line/docs/index.id.md`
    - `src/adapters/auth/line/docs/index.ja.md`
- バージョン索引更新:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## コミット

- [2cafed8](https://github.com/le-firehawk/Cognis/commit/2cafed8)
