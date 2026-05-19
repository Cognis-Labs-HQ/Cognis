# 認証パスワードリセット

## Summary

ユーザー設定 → セキュリティに、プロバイダー連動のパスワードリセットを追加しました。サーバールートは現在の認証プロバイダーの対応可否を評価し、アダプター所有のリセット処理を実行します。

Administration の Authentication セクション登録を削除し、認証プロバイダーの管理をアダプター設定面に集約しました。

Auth アダプターを拡張し、パスワードリセット機能契約と LDAP のオプトイン writeback 設定をアダプター設定スキーマに追加しました。

## Changed Files/Components

- `src/gateways/auth/bootstrap.ts`（設定セクション登録、パスワードリセットルート、トークンのプロバイダー紐付け）
- `src/gateways/auth/gateway.ts`（アダプターのリセット対応契約とゲートウェイ制御）
- `src/gateways/auth/access-tokens.ts`、`src/gateways/auth/guard.ts`（プロバイダー付きトークンクレーム）
- `src/gateways/auth/ui/security-prefs.js` と `src/gateways/auth/ui/languages/*/strings.xml`（設定セキュリティ UI）
- `src/adapters/auth/local/*`、`src/adapters/auth/ldap/*`、`src/adapters/auth/oidc/*`、`src/adapters/auth/saml/*`（アダプター機能拡張）
- `src/gateways/auth/tests/*` と `src/adapters/auth/*/tests/*`（テスト更新）
- バージョンマニフェストと `src/docs/versions.*.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/5943c6b5689c6a4ddc9fde487bc128f45bd1be25
