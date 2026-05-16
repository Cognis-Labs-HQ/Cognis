# Jitsi Meet モジュール基盤

## 概要

設定可能なインスタンス設定、ミーティング永続化、参加者制限アクセスチェック、ミーティングセッション状態 API、専用 Meetings ページ、管理監視を備えた新しい Jitsi Meet モジュールを追加しました。

その後の改善:

- Meetings ページのレイアウトは完全に composer で制御されます。参加者パネルは上部にフル幅で表示され、ミーティングウィンドウとチャットはそれぞれ利用可能なグリッド幅の半分を占めます（`gridSize.max: 'half'`）。
- 「Meeting Overlay」を全体で「Meeting Window（ミーティングウィンドウ）」に改名しました。
- 「利用可能な参加者」テーブルはページ読み込み時にすべての可視ユーザーで初期表示されます。
- 参加者検索がポップアップ方式に変更されました（メッセージの「新規会話」UX と同様）。
- 新しいエンドポイント `GET /api/v1/modules/jitsi-meet/participants?q=` が可視プロファイルを提供します（`q` が空の場合は全件、それ以外はフィルタリング）。
- 参加者テーブルをアバタープールに置き換えました。各アバターはドラッグ可能（ホバー時プロフィールプレビュー付き）で、ミーティングウィンドウにドロップすると「ミーティングウィンドウ」テキストの上に表示されます（緑のドロップゾーンハイライト付き）。
- 「参加者を検索」ポップアップに複数選択をサポートし、フローティング「選択を追加」ボタンで確認すると、すべての選択ユーザーが利用可能プールに追加されます。
- Composer によるカスタマイズとレイアウト永続化を有効化しました。
- ミーティング前チャットメッセージを「ミーティングの開始を待っています。」に変更しました。
- 事前チェックは Jitsi インスタンスが正常なプローブ応答を返すとすぐに緑のチェックマークを表示するようになりました。
- ハンドルの大文字・小文字を区別した検索によるミーティング作成時の 400 エラーを修正しました。`getProfileByHandle` は大文字・小文字を区別しない照合を使用するようになりました。
- 管理 → コンポーネント: 設定ボタンをチェブロン `<summary>` の内側から、展開されたモジュール詳細セクションに移動し、歯車アイコンをテキスト「設定」ボタンに置き換えました。

## 変更されたファイル / コンポーネント

- `src/modules/jitsi-meet/ui/app.js`（アバタープール、複数選択、緑チェック、ドラッグtoステージ、Composer オプション）
- `src/modules/jitsi-meet/ui/jitsi-meet.css`（アバタープール、配置済み参加者、ドロップゾーンハイライト、チェックインジケーター）
- `src/modules/jitsi-meet/ui/languages/*/strings.xml`（新しいキー: probe_done、add_selected; chat.pending 更新）
- `src/ui/reuse/search-bar.js`（multiSelect + onSelectMultiple サポート、確認フッター）
- `src/ui/styles/reuse/search-bar.css`（複数選択結果スタイル、確認フッター）
- `src/ui/styles/page-builder.css`（設定ボタンスタイル、歯車ボタンスタイル削除）
- `src/ui/app/administration/index.js`（設定ボタンを展開セクションに移動）
- `src/adapters/social/profile/store.ts`（大文字・小文字を区別しない getProfileByHandle）

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
