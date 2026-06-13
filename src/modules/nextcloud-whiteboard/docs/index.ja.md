# Nextcloud Whiteboard

## 概要

Nextcloud Whiteboard モジュールは、Nextcloud の共同ホワイトボードアプリケーションを Cognis の教室に統合します。モジュールが有効になり Nextcloud インスタンスで設定されると、教師は教室ワークスペース内でホワイトボードを開くことができ、生徒はリアルタイムで同じボードに参加します。この統合は署名済み JWT トークンを使用するため、Cognis ユーザーは独自の Nextcloud アカウントを必要としません。

このモジュールは `whiteboard:getEmbedUrl` と `whiteboard:fetchBoardData` ケイパビリティを提供するため、教室アダプターはモジュールの内部を直接インポートせずにホワイトボードを開くことができます。

## 責務

- Nextcloud Whiteboard ボードを iframe 内に埋め込むための短命な JWT トークンを発行する。
- 教室にスコープされたホワイトボードボードの作成、取得、設定のための API ルートを公開する。
- オペレーターが Nextcloud インスタンス URL、アプリシークレット、ボードのデフォルト値を設定できる管理設定ポップアップを提供する。
- `ctx` を通じて `whiteboard:getEmbedUrl` と `whiteboard:fetchBoardData` ケイパビリティを登録する。

責任外: ボードコンテンツの保存（Nextcloud がそれを管理）、Nextcloud ユーザーや権限の管理、または教室メンバーシップの確認。

## 設定

| 変数                          | デフォルト | 説明                                                                       |
| ----------------------------- | ---------- | -------------------------------------------------------------------------- |
| `NEXTCLOUD_URL`               | _(なし)_   | Nextcloud インスタンスのベース URL。ホワイトボードの埋め込みに必要。       |
| `NEXTCLOUD_WHITEBOARD_SECRET` | _(なし)_   | Nextcloud Whiteboard の JWT トークン署名に使用する共有アプリシークレット。 |

## API ルート

| メソッド | パス                                              | 説明                                    | 認証   |
| -------- | ------------------------------------------------- | --------------------------------------- | ------ |
| `GET`    | `/api/v1/modules/nextcloud-whiteboard/config`     | 現在の管理設定を取得                    | 管理者 |
| `PUT`    | `/api/v1/modules/nextcloud-whiteboard/config`     | 管理設定を更新                          | 管理者 |
| `POST`   | `/api/v1/modules/nextcloud-whiteboard/boards`     | 新しいホワイトボードボードを作成        | 必須   |
| `GET`    | `/api/v1/modules/nextcloud-whiteboard/boards/:id` | ボードのメタデータと埋め込み URL を取得 | 必須   |
