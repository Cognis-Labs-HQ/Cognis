# Messages ブラウザークライアント

Messages ブラウザークライアントは、Social Messages アダプター所有の認証済み API 契約を通じて、モジュールによるルームメッセージ一覧、プライベートルーム作成、メッセージ送信を可能にします。

## 使用例

`uiCtx` をインポートして `social:messagesUiClient` を要求し、ブラウザーコードから `listRoomMessages(roomId, options)`、`openPrivateRoom(payload, options)`、`sendRoomMessage(roomId, payload)` を呼び出します。

## 技術仕様

クライアントは元の `Response` を返し、状態とペイロードの処理を呼び出し側に委ねます。ルーム ID を URI エンコードし、ルート知識を所有アダプター内に保持し、任意のアクセストークンとアクセス拒否通知の抑止を転送し、書き込みを JSON で送信します。Social ゲートウェイと Messages アダプターが有効な間だけ利用できます。

## ブラウザー VoIP プロバイダー契約

ブラウザープロバイダーが `voip:startCall` Capability を `uiCtx.capabilities` に提供すると、Messages はダイレクトチャットとグループチャットにビデオ通話アクションを表示します。プロバイダーには、ルーム識別情報、全チャットメンバーのアカウント識別情報と表示メタデータ、`messages` ソース識別子、および `pip` 表示要求が渡されます。ミーティングの作成、参加者の招待、現在のページへのピクチャーインピクチャー通話画面のマウントはプロバイダーが担当します。
