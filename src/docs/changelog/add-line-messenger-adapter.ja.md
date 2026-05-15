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

加えて Registration Gateway に手動承認フロー用の新しい `requests`
アダプターを追加しました。公開登録が無効または利用不可の場合、
外部 SSO（LINE を含む）の初回ログインは即時アカウント作成ではなく、
承認待ちの登録リクエストを作成します。

管理者は Administration → Registration でリクエストを承認/却下でき、
ログイン UI は保留・却下・登録不可の状態をローカライズ済みトーストで表示します。

認証ゲートウェイは、Auth アダプターが Cognis 管理のコールバックルートを
公開できるようになりました。LINE アダプターは `/auth/line/callback` を
登録し、そのパスを管理画面の設定 API 経由で公開します。さらに Authentication
ポップアップは生成された Callback URL を表示し、保存済みの値がない場合は
`redirectUri` を自動入力します。

## 変更されたコンポーネント/ファイル

- 認証ゲートウェイ:
    - `src/gateways/auth/gateway.ts`
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/auth/manifest.json`
    - `src/gateways/auth/ui/admin-section.js`
    - `src/gateways/auth/ui/languages/en/strings.xml`
    - `src/gateways/auth/ui/languages/de/strings.xml`
    - `src/gateways/auth/ui/languages/id/strings.xml`
    - `src/gateways/auth/ui/languages/ja/strings.xml`
    - `src/gateways/auth/tests/auth-gateway.test.ts`
    - `src/gateways/auth/tests/admin-section.test.js`
    - `src/gateways/auth/docs/index.en.md`
    - `src/gateways/auth/docs/index.de.md`
    - `src/gateways/auth/docs/index.id.md`
    - `src/gateways/auth/docs/index.ja.md`
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
- 新しい登録リクエストアダプター:
    - `src/adapters/registration/requests/index.ts`
    - `src/adapters/registration/requests/package.json`
    - `src/adapters/registration/requests/manifest.json`
    - `src/adapters/registration/requests/tests/requests-adapter.test.ts`
- Registration Gateway:
    - `src/gateways/registration/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/registration/manifest.json`
    - `src/gateways/registration/ui/admin-section.js`
    - `src/gateways/registration/ui/languages/en/strings.xml`
    - `src/gateways/registration/ui/languages/de/strings.xml`
    - `src/gateways/registration/ui/languages/id/strings.xml`
    - `src/gateways/registration/ui/languages/ja/strings.xml`
- ログイン UI + i18n:
    - `src/ui/app/login/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- バージョン索引更新:
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`

## コミット

- [0ad1215](https://github.com/le-firehawk/Cognis/commit/0ad1215)
- [dcc34fc](https://github.com/le-firehawk/Cognis/commit/dcc34fc)
- [562d0ed](https://github.com/le-firehawk/Cognis/commit/562d0ed)
