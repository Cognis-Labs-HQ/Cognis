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
- ミーティングストアのスキーマは前向き設計です。`ensureTable` が正式なカラム定義を保持し、旧スキーマへの後方互換コードはすべて削除されました。
- ミーティング作成時に生成した URL スラッグから `room_slug` を保存するようにし、旧来の `room_slug` 列が `NOT NULL` のまま残っている DB でも失敗しないようにしました。
- ミーティングに関連付けられたグループチャットのルームタイトルに、ミーティング日付が含まれるようになりました。
- ミーティング用グループチャットのメンバー数をクリックすると、現在参加中のユーザーをプロフィールプレビュー付きのリンクアバターで表示するポップアップが開くようになりました。
- ライトテーマでは Meeting Window のオーバーレイ表現を大幅に明るくし、ミーティング開始前のステージが暗すぎて読みにくくならないようにしました。

## 変更されたファイル / コンポーネント

- `src/modules/jitsi-meet/ui/app.js`（アバタープール、複数選択、緑チェック、ドラッグtoステージ、Composer オプション）
- `src/modules/jitsi-meet/ui/jitsi-meet.css`（アバタープール、配置済み参加者、ドロップゾーンハイライト、チェックインジケーター）
- `src/modules/jitsi-meet/ui/languages/*/strings.xml`（新しいキー: probe_done、add_selected; chat.pending 更新）
- `src/ui/reuse/search-bar.js`（multiSelect + onSelectMultiple サポート、確認フッター）
- `src/ui/styles/reuse/search-bar.css`（複数選択結果スタイル、確認フッター）
- `src/ui/styles/page-builder.css`（設定ボタンスタイル、歯車ボタンスタイル削除）
- `src/ui/app/administration/index.js`（設定ボタンを展開セクションに移動）
- `src/adapters/social/profile/store.ts`（大文字・小文字を区別しない getProfileByHandle）
- `src/modules/jitsi-meet/api/store.js`（前向き設計スキーマに加え、ミーティング INSERT 時の `room_slug` 互換を追加）
- `src/modules/jitsi-meet/api/index.js`（日付付きミーティングチャットタイトル、チャットルーム要約エンドポイント）
- `src/adapters/social/messages/ui/app.js`（参加状況要約ポップアップ用のクリック可能なメンバー数）
- `src/adapters/social/messages/ui/messages.css`（メンバー要約ポップアップとクリック可能なサブタイトルのスタイル）
- `src/adapters/social/messages/ui/languages/*/strings.xml`（参加中ユーザー要約用の文字列）
- `src/modules/jitsi-meet/api/tests/store.test.js`（`room_slug` 検証を追加：ミーティング URL のスラッグが保存されることを確認）
- `src/ui/tests/regression-followups.test.js`（ミーティングチャットタイトルとメンバー要約のリグレッション）
- `src/modules/jitsi-meet/ui/jitsi-meet.css`（ライトテーマでの Meeting Window オーバーレイ、スピナー、配置済みユーザーのコントラスト改善）

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
- https://github.com/le-firehawk/Cognis/commit/65261ce6
