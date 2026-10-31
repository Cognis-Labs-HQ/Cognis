# SMTP メールアダプター

SMTP は通常の TCP、STARTTLS、TLS、任意の認証、一時エラーへの回数制限付き再試行に対応します。テンプレートは通知ゲートウェイから登録します。通信側は MIME の作成、ヘッダーの無害化、添付ファイルに対応します。送信経路はすべて選択したキューを使い、`send` は配信を待ち、`sendTracked` は直ちに受付情報を返します。

## ブートストラップ時の用途

SMTP の用途はゲートウェイまたはモジュールのブートストラップ中に `ctx` で登録します。`notify:registerSmtpPurpose` を取得し、ローカルな用途名で呼び出して完了を待ち、返された所有元に結び付いた識別子を保持してください。登録ごとに専用キューと受信者別の待機状態を作成します。アダプターには固定の用途一覧を持たせません。

```js
const registerPurpose = ctx.getCapability("notify:registerSmtpPurpose");
const purpose = await registerPurpose("digest");
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, templateId, variables });
```

すべての `notify:sendEmail` 呼び出しは登録済みの `purpose` を指定する必要があります。未指定や未知の用途は SMTP 通信前に拒否し、送信時に暗黙で用途を作成しません。ブートストラップの完了、失敗、時間切れ後は、保持されたコールバックや分離した非同期処理からも登録できません。起動後に有効化したモジュールは自身のブートストラップ中に登録できます。無効化やアンインストールではキューを破棄し、保留中の送信を拒否して SMTP 接続を閉じます。

## 配信とキュー

既定の間隔は用途ごとに正規化した受信者あたり十五秒です。用途別のキューは並行処理するため、ある用途の遅い接続、再試行、待機時間が他を妨げません。待機時間は送信成功後だけ更新します。キュー一覧は全用途をまとめて識別子を表示し、各キューの完了済み履歴を最大 200 件メモリーに保持します。

汎用エンベロープには `purpose` を含めます。SMTP 専用の送信・キュー関数は用途を第一引数で受け取ります。ゲートウェイのテスト関数は `(senderId, purpose, recipientEmail, config)` を使います。既存の通知ゲートウェイの補助関数は自身が登録した用途を指定します。汎用呼び出しを使うコンポーネントやモジュールはブートストラップ中に用途を登録し、実行時には返された識別子を再利用します。

## 設定

`COGNIS_SMTP_HOST`、`COGNIS_SMTP_PORT`（587）、`COGNIS_SMTP_FROM`、必要に応じて `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS`、`COGNIS_SMTP_SECURE`（`none`、`starttls`、`tls`）を設定します。送信者名、EHLO ホスト、証明書・認証方針、コード長は既存のアダプター設定を使います。テストメールは上書き設定をキューに保持できます。
