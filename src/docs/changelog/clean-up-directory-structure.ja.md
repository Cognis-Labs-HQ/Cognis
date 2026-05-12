# PR変更履歴 — ディレクトリ構造の整理

## 概要

日本語学習コンテンツは言語モジュールで提供されるため、重複して混乱を招く
`src/adapters/study/japanese/` の旧Studyアダプターを削除しました。

Studyゲートウェイのアダプター探索/ブートストラップでは、レガシー用の
ハードコードされたスキップ条件を廃止し、汎用的な処理にしました。

プロフィールページでは、投稿公開範囲の案内をインラインヒント文から
情報ツールチップに置き換えました。

ゲートウェイ・アダプター固有のHTMLページ、JavaScriptアプリモジュール、
CSSスタイルシートを `src/ui/` から各アダプター・ゲートウェイのディレクトリに
移動しました。コンポーネント自己完結の原則に従い、プロフィール・メッセージ・
クラスの各アダプターが `ui/` サブディレクトリから独自の `index.html`、
`app.js`、CSSを提供するようになりました。通知設定とスタディ設定モジュールも
各ゲートウェイの `ui/` ディレクトリに移動し、`createSettingsSection`
エクスポートを追加しました。

`UIRegistry` に `SettingsSection` プラグインシステムを追加し、ゲートウェイが
設定ページのセクションを動的に登録できるようにしました。新たな
`GET /api/v1/ui/settings-sections` エンドポイントで登録済みセクションを
クライアントに公開します。設定ページは貢献されたセクションを動的にインポートして
マウントするようになり、通知・スタディ設定のハードコードされたインポートを
廃止しました。

## 変更したファイル/コンポーネント

- Studyゲートウェイ:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- 削除したレガシーアダプター:
    - `src/adapters/study/japanese/`（削除）
- プロフィールアダプター:
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/ui/index.html`
    - `src/adapters/social/profile/ui/profile.css`
- メッセージアダプター:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/index.html`
    - `src/adapters/social/messages/ui/messages.css`
- クラスアダプター:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/ui/app.js`
    - `src/adapters/study/classes/ui/index.html`
    - `src/adapters/study/classes/ui/classes.css`
- Notifyゲートウェイ:
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/ui/notification-prefs.js`
- Studyゲートウェイ:
    - `src/gateways/study/ui/study-prefs.js`
- UIインフラストラクチャ:
    - `src/api/ui-registry.ts`
    - `src/api/routes/ui/index.ts`
    - `src/ui/app/settings/index.js`
    - `src/ui/reuse/app-router.js`

## コミット

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
- [e81c254](https://github.com/le-firehawk/Cognis/commit/e81c254)
