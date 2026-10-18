# コールバックの移動

**機能ブランチ:** fix-x-sso-held-login-pr226

## 承認を維持

ドキュメント移動は明示的に指定します。サーバーで描画する移動先を管理する呼び出し側が、`navigateTo` に `documentNavigation: true` を渡します。不明な SPA 移動先と不正な URL は false を返し、共有レンダラーの欠落通知など呼び出し側の復旧動作を維持します。保護された移動を再開する場合も、移動ガードと同一オリジンの HTTP 検査が適用されます。 `ui:log` は送信成否を真偽値で返し、匿名要求を省略し、アクセス拒否や接続回復イベントを発生させずに HTTP・ネットワーク送信失敗を処理します。ユーザーへの通知は呼び出し側が担当し、ログエンドポイントは引き続き認証を要求します。

## コミット

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
- [9a9387b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a9387b199dfa3208b83a51aa66d3820a915297a)
