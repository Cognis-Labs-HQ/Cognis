# Jitsi Meet モジュール基盤

## 概要

設定可能なインスタンス設定、ミーティング永続化、参加者制限アクセスチェック、ミーティングセッション状態 API、専用 Meetings ページ、管理監視を備えた新しい Jitsi Meet モジュールを追加しました。

## 変更されたファイル / コンポーネント

- `src/modules/jitsi-meet/*`（新規モジュール API、ストア、UI、i18n、ドキュメント）
- `src/modules/routes/module-extensions.ts`（モジュール UI / capability 登録の拡張）
- `src/api/server.ts` と `src/api/main.ts`（モジュール capability プロバイダー連携）
- `src/adapters/social/messages/*`（グループチャット URL 解決/再利用 capability）
- `src/ui/app/administration/index.js`（モジュール設定ポップアップ対応）
- `src/ui/languages/*/strings.xml`（再利用可能なミーティングキー追加）

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
