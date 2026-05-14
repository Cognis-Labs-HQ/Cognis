# 管理者向け一斉通知の配信モードと対象制御

## 概要

通知セクションに、管理者が設定できる新しい一斉通知機能を追加しました。配信モードは「ページ上部バー」と「ポップアップ」の2種類です。管理者は対象ロール、開始日時・終了日時、確認必須設定、閉じる際のリダイレクト動作、有効/無効状態を設定できます。

ダッシュボードでは notify の一斉通知ナビゲーションプラグインを読み込み、ログイン中ユーザーのロールに対して有効な一斉通知を取得し、設定されたモードで表示します。

## 変更されたファイル・コンポーネント

- `src/gateways/notify/notification-store.ts` — 一斉通知の永続化スキーマとユーザー単位の状態追跡を追加。
- `src/gateways/notify/routes/notifications.ts` — 一斉通知API（作成/一覧、有効化/無効化、有効通知取得、確認、閉じる）を管理者/ユーザー向けに追加。
- `src/gateways/notify/ui/admin-section.js` — 一斉通知を設定・管理する管理UIを追加。
- `src/gateways/notify/ui/broadcast-navbar-plugin.js` — 有効な一斉通知をバーまたはポップアップで表示する新しいダッシュボードプラグインを追加。
- `src/gateways/notify/ui/broadcast.css` — 一斉通知バーのスタイルを追加。
- `src/gateways/notify/ui/languages/*/strings.xml` — 一斉通知用のi18nキーを全対応言語に追加。
- `src/gateways/notify/bootstrap.ts` — 一斉通知ナビゲーションプラグインを登録し、ゲートウェイ登録バージョンを更新。
- `src/gateways/notify/manifest.json` と `src/docs/versions.en.md` — Notification ゲートウェイのバージョンを `1.4.0` に更新。
- `src/gateways/notify/routes/tests/notification-routes.test.ts` — 新しい一斉通知エンドポイントのルートテストを追加。

## コミット

- https://github.com/le-firehawk/Cognis/commit/e14cbfc
