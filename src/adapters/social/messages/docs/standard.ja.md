# メッセージ

## 概要

メッセージアダプターは Social Gateway 上で 1:1 とグループの
プライベートチャットを提供します。チャットルーム、メンバーシップ、
メッセージ本文はデータベースに保存されます。本文はクライアント側で
ルーム鍵により暗号化され、さらに `DATA_ENCRYPTION_KEY` で保存時に
再ラップされます。

## エンドポイント

すべてのエンドポイントは `/api/v1/social/messages` 配下です。`GET /messages/ping`
以外は認証が必要です。

| メソッド | パス                                                | 説明                                                           |
| -------- | --------------------------------------------------- | -------------------------------------------------------------- |
| GET      | `/messages/ping`                                    | アダプター稼働確認 (`{ ready: true }`)。                       |
| GET      | `/messages/users/lookup?q=…`                        | 送信先プロフィール検索。                                       |
| GET      | `/messages/rooms`                                   | 現在ユーザーのルーム一覧（プレビュー・未読数付き）。           |
| POST     | `/messages/rooms`                                   | DM/グループ作成。DM は保留リクエストとして開始される場合あり。 |
| GET      | `/messages/requests`                                | 受信した保留メッセージリクエスト一覧。                         |
| POST     | `/messages/requests/:id/approve`                    | リクエスト承認と DM ルーム作成/再利用。                        |
| POST     | `/messages/requests/:id/reject`                     | リクエスト拒否。事前作成された DM ルームから受信者を削除。     |
| GET      | `/messages/rooms/:id`                               | ルーム情報とメンバー。                                         |
| GET      | `/messages/rooms/:id/messages?before&limit`         | ページング履歴（受信側が保留中の場合は承認まで空配列）。       |
| POST     | `/messages/rooms/:id/messages`                      | メッセージ追加（`ciphertext`, `iv`, 任意 `authTag`）。         |
| POST     | `/messages/rooms/:id/messages/:messageId/reactions` | 絵文字リアクションのトグル。                                   |
| POST     | `/messages/rooms/:id/read`                          | 現在時刻まで既読に更新。                                       |
| GET      | `/messages/rooms/:id/typing`                        | タイピング中ユーザー一覧（リクエスト元は除外）。               |
| POST     | `/messages/rooms/:id/typing`                        | 現在ユーザーのタイピング状態更新。                             |
| POST     | `/messages/rooms/:id/members`                       | メンバー追加（owner/admin のみ）。                             |
| DELETE   | `/messages/rooms/:id/members/:handle`               | メンバー削除（自分の退出または owner による除外）。            |

## 利用条件

ユーザー **A** が **B** に DM を開ける条件:

1. 双方向でブロックされていないこと
2. 両者のプロフィールが可視であること
3. 相互フォローであること

相互フォローのみ満たさない場合、`POST /messages/rooms` は `202` で保留
リクエストを返します。

過去に承認済みリクエスト履歴があるペアは相互フォロー条件を省略できますが、
ブロック/可視性条件は常に必須です。

## 脅威モデル

- **通信中**: TLS で保護。
- **データベース**: クライアント暗号化 + サーバー保存時ラップの二重保護。
- **完全な E2E ではない**: サーバー侵害時は復号可能。
- **メタデータ**: メンバー情報、送信時刻、暗号文長は運用者に見える。

## 通知連携

新規メッセージ保存時、他メンバーごとにカテゴリ `messages` の通知を
Notify Gateway へ送信します。`actionUrl` は `/messages/<room-id>` です。
ルーム単位のミュート設定やカテゴリ設定で通知は抑止されます。

## ルームメンバーシップのタイムラインイベント

メンバーシップの変更は、パッシブな `member_joined` および `member_left` エントリと同じトランザクションで、ルームの `chat_messages` タイムラインに保存されます。これらのエントリは `application/vnd.cognis.room-event+json` コンテンツタイプを使用します。呼び出し側はメンバーシップを変更するだけで、別のルームを作成したりイベントを個別に発行したりしません。会議チャットの解決でも、解決された全参加者に同じ処理を適用します。

メッセージリクエストだけではチャットルームを作成しません。受信者が承認した時点で、ダイレクトメッセージのルーム、キー、メンバーシップ、最初の参加イベントを作成します。これにより、リクエスト専用ルームが参加者のルーム一覧に表示されることを防ぎます。
