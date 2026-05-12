# Jitsi Meet モジュールとミーティング永続化

## 概要

- API と UI のエントリポイントを持つ独立した拡張モジュール `jitsi-meet` を追加しました。
- 参加者制御とルーム再利用キーを備えた `meeting_rooms` の永続レコードを導入しました。
- 教室スキーマの基盤とメッセージ連携フックを追加し、ミーティング時にチャットルームを自動連携できるようにしました。

## 変更されたファイル/コンポーネント

- `src/modules/jitsi-meet/`（新規モジュールマニフェスト、API、UI、ナビゲーションバー用プラグイン、ロケール文字列）
- `src/modules/routes/module-extensions.ts`（モジュール API コンテキストの伝播）
- `src/api/server.ts`, `src/api/main.ts`, `src/api/routes/ui/index.ts`（モジュール capability/コンテキスト連携とモジュール navbar/static 対応）
- `src/adapters/study/classes/`（教室スキーマと教室 capability の公開）
- `src/adapters/social/messages/`（モジュール連携向けチャットルーム作成 capability）
- `src/ui/public/templates/dashboard-layout.html`, `src/ui/layouts/dashboard-layout.js`, `src/ui/languages/*/strings.xml`（Meetings ナビゲーション表示と導線）

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/6fb2d2deff0b75ea44536e458f4ef4a0bf56d708
