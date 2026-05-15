# Jitsi Meetモジュール（ユーザー間セッション）

## 概要

`src/modules/jitsi-meet` に自己完結型の `jitsi-meet` モジュールを追加しました。ユーザー同士の1対1会議、管理者が設定できるJitsiベースURL、CognisネイティブDMルームへの実行時リンク、そして利用可能環境でのDocument PiPによるPicture-in-Pictureを提供します。

## 変更ファイル / コンポーネント

- `src/modules/jitsi-meet/api/index.js` — 設定、セッション作成、参加者プリフライト検証のAPIルート。
- `src/modules/jitsi-meet/api/store.js` — 参加者FKカラム付きの会議エンティティと設定のDB永続化。
- `src/modules/jitsi-meet/ui/app.js` — 会議ページロジック、連絡先検索、ルーム起動、ネイティブチャットルーム解決、PiP操作。
- `src/modules/jitsi-meet/ui/admin-section.js` — Administration内のJitsiベースURL設定パネル。
- `src/modules/jitsi-meet/ui/navbar.js` — `/meetings` へのナビゲーションリンク追加。
- `src/modules/jitsi-meet/languages/*/strings.xml` — モジュールのローカライズ文字列。
- `src/modules/jitsi-meet/docs/index.*.md` — 対応言語のモジュールドキュメント。

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/805d8f0
