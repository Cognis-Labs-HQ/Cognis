# 存在しないログアウトエンドポイントの修正

## 概要

`POST /api/v1/auth/logout` エンドポイントがすべてのリクエストに対して 404 を
返していました。ログアウトハンドラーは古い `routes/index.ts`（`createAuthRoutes`）
にのみ存在し、一度も登録されていませんでした。`bootstrap.ts` 内の実際のルート
ハンドラー `createAuthGatewayRoutes` にはログアウトのケースが含まれていませんでした。

この修正では、ログアウトエンドポイントを `createAuthGatewayRoutes` に直接追加します。
ログアウト時にはクッキートークンと `Authorization` ヘッダーの Bearer トークンを
失効させ、`cognis_access_token` クッキーをクリアし、`info` レベルでイベントを
記録します。

## 変更されたファイル / コンポーネント

- `src/gateways/auth/bootstrap.ts` — `createAuthGatewayRoutes` に
  `POST /api/v1/auth/logout` ルートを追加。`access-tokens.js` から
  `revokeAccessToken` をインポート

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893
