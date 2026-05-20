# 認証パスワードリセット

## Summary

ユーザー設定 → セキュリティに、プロバイダー連動のパスワードリセットを追加しました。サーバールートは現在の認証プロバイダーの対応可否を評価し、アダプター所有のリセット処理を実行します。

Administration の Authentication セクション登録を削除し、認証プロバイダーの管理をアダプター設定面に集約しました。

Auth アダプターを拡張し、パスワードリセット機能契約と LDAP のオプトイン writeback 設定をアダプター設定スキーマに追加しました。

Settings の Security セクションで発生していた実行時エラーを、セクションを正しい Settings ルートに接続することで修正し、さらにコンポーネント文字列を settings section にマージする i18n 拡張で不足していた文字列表示も修正しました。

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts`（設定セクション登録、パスワードリセットルート、トークンのプロバイダー紐付け）
- `src/gateways/auth/gateway.ts`（アダプターのリセット対応契約とゲートウェイ制御）
- `src/gateways/auth/access-tokens.ts`、`src/gateways/auth/guard.ts`（プロバイダー付きトークンクレーム）
- `src/gateways/auth/ui/security-prefs.js` と `src/gateways/auth/ui/languages/*/strings.xml`（設定セキュリティ UI とレンダー修正）
- `src/adapters/auth/local/*`、`src/adapters/auth/ldap/*`、`src/adapters/auth/oidc/*`、`src/adapters/auth/saml/*`（アダプター機能拡張）
- `src/gateways/auth/tests/*` と `src/adapters/auth/*/tests/*`（テスト更新）
- バージョンマニフェストと `src/docs/versions.*.md`
- `src/ui/app/settings/index.js`（コンポーネント文字列を取り込む settings section i18n 拡張）

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/a33f0faa
- https://github.com/le-firehawk/Cognis/commit/9490a011
- https://github.com/le-firehawk/Cognis/commit/8ba1d8b2
