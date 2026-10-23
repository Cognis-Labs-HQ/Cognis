# コールバックの移動

**機能ブランチ:** fix-x-sso-held-login-pr226

## 承認を維持

独立した認証コールバックは、サーバードキュメントへの遷移に `page-entry.js` の `navigateToDocument(path, { signal })` を使用します。この関数は認証情報を埋め込まない同一オリジンの HTTP(S) URL を検証し、既存のナビゲーションガードを尊重して、キャンセル後の遷移を防ぎます。ダッシュボードの遷移とレンダラー不在時の動作は、変更のない SPA ルーターが引き続き担当します。`ui:log` は匿名リクエストを省略して配信失敗を処理し、ログエンドポイントは引き続き認証を要求します。

## コミット

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
- [9a9387b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a9387b199dfa3208b83a51aa66d3820a915297a)
- [aad15f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/aad15f0cca5eaa3e93ac08eec5e27f72d8b95163)
