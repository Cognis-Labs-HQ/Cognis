# Jitsi Meet モジュール基盤

## 概要

設定可能なインスタンス設定、ミーティング永続化、参加者制限アクセスチェック、ミーティングセッション状態 API、専用 Meetings ページ、管理監視を備えた新しい Jitsi Meet モジュールを追加しました。

その後の改善:
- Meetings ページのレイアウトは完全に composer で制御されます。参加者パネルは上部にフル幅で表示され、ミーティングウィンドウとチャットはそれぞれ利用可能なグリッド幅の半分を占めます（`gridSize.max: 'half'`）。
- 「Meeting Overlay」を全体で「Meeting Window（ミーティングウィンドウ）」に改名しました。
- 「利用可能な参加者」テーブルはページ読み込み時にすべての可視ユーザーで初期表示されます。
- 参加者検索がポップアップ方式に変更されました（メッセージの「新規会話」UX と同様）。
- 新しいエンドポイント `GET /api/v1/modules/jitsi-meet/participants?q=` が可視プロファイルを提供します（`q` が空の場合は全件、それ以外はフィルタリング）。

## 変更されたファイル / コンポーネント

- `src/modules/jitsi-meet/*`（新規モジュール API、ストア、UI、i18n、ドキュメント）
- `src/modules/routes/module-extensions.ts`（モジュール UI / capability 登録の拡張）
- `src/api/server.ts` と `src/api/main.ts`（モジュール capability プロバイダー連携）
- `src/adapters/social/messages/*`（グループチャット URL 解決/再利用 capability）
- `src/ui/app/administration/index.js`（モジュール設定ポップアップ対応）
- `src/ui/languages/*/strings.xml`（再利用可能なミーティングキー追加）

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
