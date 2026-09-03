# Messages ブラウザークライアント

Messages ブラウザークライアントは、Social Messages アダプター所有の認証済み API 契約を通じて、モジュールによるルームメッセージ一覧、プライベートルーム作成、メッセージ送信を可能にします。

## 使用例

`uiCtx` をインポートして `social:messagesUiClient` を要求し、ブラウザーコードから `listRoomMessages(roomId, options)`、`openPrivateRoom(payload, options)`、`sendRoomMessage(roomId, payload)` を呼び出します。

## 技術仕様

クライアントは元の `Response` を返し、状態とペイロードの処理を呼び出し側に委ねます。ルーム ID を URI エンコードし、ルート知識を所有アダプター内に保持し、任意のアクセストークンとアクセス拒否通知の抑止を転送し、書き込みを JSON で送信します。Social ゲートウェイと Messages アダプターが有効な間だけ利用できます。

公開機能 `social:messages:deleteChatroom` はルーム ID と実行者のアカウント ID を受け取ります。実行者がルームの作成者、または唯一残った参加者である場合に、ルームとその依存レコードを完全に削除します。

## ブラウザー VoIP プロバイダー契約

Messages は、ダイレクトチャットまたはグループチャットごとに、ブラウザープロバイダーの `voip:startCall` ケイパビリティへ解決を要求します。プロバイダーには、ルーム識別情報、全メンバーのアカウント識別情報と表示メタデータ、`messages` ソース識別子、対応する `component` および `navigate` アクションが渡されます。`null` を返すと、そのルームではカメラが非表示になります。`component` の結果にはコンポーネント UUID、ルート ID、ミーティングコンテキスト、任意のモードを含め、Cognis が一時ステージを所有し、コンポーネントウィンドウをマウントして、終了時または失敗時にステージを削除します。`navigate` の結果には、アプリルーター向けに `/meetings/<meetingId>?start=1` などの同一オリジン URL を含めます。これによりプロバイダーは、Messages のレイアウトを直接変更せず、ルームで一時通話を作成できるか、既存ミーティングを開くか、リダイレクトするかを決定できます。
