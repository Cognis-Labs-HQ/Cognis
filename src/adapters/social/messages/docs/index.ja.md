# Messages ブラウザークライアント

Messages ブラウザークライアントは、Social Messages アダプター所有の認証済み API 契約を通じて、モジュールによるルームメッセージ一覧、プライベートルーム作成、メッセージ送信を可能にします。

## 使用例

`uiCtx` をインポートして `social:messagesUiClient` を要求し、ブラウザーコードから `listRoomMessages(roomId, options)`、`openPrivateRoom(payload, options)`、`sendRoomMessage(roomId, payload)` を呼び出します。

## 技術仕様

クライアントは元の `Response` を返し、状態とペイロードの処理を呼び出し側に委ねます。ルーム ID を URI エンコードし、ルート知識を所有アダプター内に保持し、任意のアクセストークンとアクセス拒否通知の抑止を転送し、書き込みを JSON で送信します。Social ゲートウェイと Messages アダプターが有効な間だけ利用できます。

公開機能 `social:messages:deleteChatroom` はルーム ID と実行者のアカウント ID を受け取ります。実行者がルームの作成者、または唯一残った参加者である場合に、ルームとその依存レコードを完全に削除します。

アダプターは `social:messages:resolveRoomMembership` も公開します。ルーム ID と要求元アカウント ID を受け取り、アクティブなルームメンバーだけを認可して、アクティブメンバーのアカウント ID を返します。プロバイダーは Messages の永続化層を直接読み取らず、この境界を使用します。
