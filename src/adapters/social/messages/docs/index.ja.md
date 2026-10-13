# Messages ブラウザークライアント

Messages ブラウザークライアントは、Social Messages アダプター所有の認証済み API 契約を通じて、モジュールによるルームメッセージ一覧、プライベートルーム作成、メッセージ送信を可能にします。

## 使用例

`uiCtx` をインポートして `social:messagesUiClient` を要求し、ブラウザーコードから `listRoomMessages(roomId, options)`、`openPrivateRoom(payload, options)`、`sendRoomMessage(roomId, payload)` を呼び出します。

## 技術仕様

クライアントは元の `Response` を返し、状態とペイロードの処理を呼び出し側に委ねます。ルーム ID を URI エンコードし、ルート知識を所有アダプター内に保持し、任意のアクセストークンとアクセス拒否通知の抑止を転送し、書き込みを JSON で送信します。Social ゲートウェイと Messages アダプターが有効な間だけ利用できます。

公開機能 `social:messages:deleteChatroom` はルーム ID と実行者のアカウント ID を受け取ります。実行者がルームの作成者、または唯一残った参加者である場合に、ルームとその依存レコードを完全に削除します。

アダプターは `social:messages:resolveRoomMembership` も公開します。ルーム ID と要求元アカウント ID を受け取り、アクティブなルームメンバーだけを認可して、アクティブメンバーのアカウント ID を返します。プロバイダーは Messages の永続化層を直接読み取らず、この境界を使用します。

「新しいルーム」選択画面は、Jitsi Meet などのユーザー専用検索と同じく、共通検索ポップアップの `category: "user"` と `typeFilter: "user"` パラメーターを使用し、会話の作成候補をユーザー結果だけに限定します。

着信はスレッドヘッダーの直下に提供アクションバーとして表示され、左側にラベル、右側にプロバイダー所有の応答・拒否 SVG アクションを配置します。過去の通話イベントは操作プロンプトではなく通常のタイムライン記録として残ります。

このアダプターは、ルーム単位のタイムラインイベントを記録するコンポーネント向けに、汎用 Capability `social:messages:appendRoomEvent` を公開します。ペイロードには中立的なイベントメタデータだけを保存し、ドメイン固有のイベント名とフィールドは所有コンポーネントが管理します。ブラウザ Flow `messages:formatRoomEvent` により、各コンポーネントは Messages に文字列や描画規則を追加せず、ローカライズ済みの表示を提供できます。

### 資源ごとの会話

`social:messages:resolveGroupChatUrl` は `usernames` と任意の `title`、`createdByAccountId`、`allowSingleMember`、`reuseExisting`、`roomId` を受け取ります。既定では同一メンバーのグループを再利用します。`reuseExisting: false` は独立した会話を作り、保存済み `roomId` はメンバー変更後も保持し、削除済みなら置き換えます。新規ルームには鍵とメンバーを設定し、再利用ルームの名前は維持します。ミーティングなどの独立資源に使える中立的契約です。
