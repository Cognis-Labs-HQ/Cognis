# ブロードキャストリンクとメール確認のための信頼済みドメイン

**機能ブランチ:** copilot/implement-trusted-domains-list

## 概要

共通の信頼済みドメイン検証を追加し、Administration のセキュリティ一覧がメールドメイン確認と信頼済み外部 HTTP(S) ブロードキャストリダイレクト / リンクの両方を制御するようにしました。

ブロードキャストのリダイレクト検証は同一オリジン URL と信頼済みドメインを受け入れるようになり、UI とサーバーの検証はサブドメインを含む同じ照合ルールを使います。

## 変更したファイル / コンポーネント

- `src/api/reuse/security-settings.ts` と `src/api/routes/system/index.ts` — セキュリティ設定の解析と、信頼済みドメイン / URL 検証を共通化しました。
- `src/gateways/registration/bootstrap.ts` — 招待メール検証に共通の信頼済みドメイン照合を再利用しました。
- `src/gateways/notify/bootstrap.ts`、`src/gateways/notify/routes/notifications.ts`、`src/gateways/notify/ui/*` — 信頼済み外部ブロードキャストリダイレクトを許可し、管理画面と実行時フローで共通検証を再利用しました。
- `src/ui/reuse/trusted-domains.js`、`src/ui/app/administration/security.js`、`src/ui/app/settings/general-prefs.js` — UI 側の信頼済みドメイン読み込み、キャッシュ無効化、メールとリンク確認用の照合を追加しました。
- `src/api/tests/security-settings.test.ts`、`src/gateways/notify/routes/tests/notification-routes.test.ts`、`src/ui/tests/trusted-domains.test.js` — 信頼済みドメイン正規化と URL 検証の挙動をテストで追加しました。
- `src/api/package.json`、`src/gateways/notify/manifest.json`、`src/gateways/registration/manifest.json`、`src/docs/versions.en.md` — API、Notification ゲートウェイ、Registration ゲートウェイのコンポーネントバージョンを更新しました。

## コミット

- [85294ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/85294ff)
