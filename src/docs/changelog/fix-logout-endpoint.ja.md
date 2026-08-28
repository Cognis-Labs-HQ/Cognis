# 存在しないログアウトエンドポイントの修正

**Feature Branch:** copilot/fix-logout-endpoint

## 概要

`POST /api/v1/auth/logout` エンドポイントがすべてのリクエストに対して 404 を
返していました。ログアウトハンドラーは古い `routes/index.ts`（`createAuthRoutes`）
にのみ存在し、一度も登録されていませんでした。`bootstrap.ts` 内の実際のルート
ハンドラー `createAuthGatewayRoutes` にはログアウトのケースが含まれていませんでした。

この修正では、ログアウトエンドポイントを `createAuthGatewayRoutes` に直接追加します。
ログアウト時にはクッキートークンと `Authorization` ヘッダーの Bearer トークンを
失効させ、`cognis_access_token` クッキーをクリアし、`info` レベルでイベントを
記録します。

ダッシュボードのログアウトフローは、ローカルトークンを削除する前に
`POST /api/v1/auth/logout` を送信し、ローカルトークンがある場合は Bearer トークン
を付与するようになりました。これにより、通常のユーザーフローでもサーバー側で
アクティブトークンを確実に失効できます。

## 変更されたファイル / コンポーネント

- `src/gateways/auth/bootstrap.ts` — `createAuthGatewayRoutes` に
  `POST /api/v1/auth/logout` ルートを追加。`access-tokens.js` から
  `revokeAccessToken` をインポート
- `src/api/reuse/access-token-http.ts` — Secure クッキー判定、アクセス
  トークンクッキー生成、クッキートークン抽出、Bearer トークン抽出の
  共通ヘルパーを追加し、認証ルートで再利用
- `src/ui/layouts/dashboard-layout.js` — ローカルトークン削除前にログアウト要求を送信し、
  ローカルトークンが存在する場合は `Authorization: Bearer ...` を付与
- `src/ui/tests/dashboard-layout-menu.test.js` — ログアウト要求の順序と
  Bearer ヘッダー付与の退行防止テストを追加

## コミットリンク

- https://github.com/Cognis-Labs-HQ/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893
