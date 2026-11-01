# SMTP メールアダプター

## ブートストラップとチャネル

SMTPがアクションの登録、メッセージの生成、キューを管理します。`notify:registerEmailPurpose`にはローカル識別子と、変数からメッセージを生成するアクション関数を渡します。ゲートウェイ、アダプター、外部モジュールは、それぞれのブートストラップ中にのみ登録でき、識別子には所有者が含まれます。Auth、Registration、TFA、Shareが各メッセージの内容を所有し、SMTPにアプリ固有の用途一覧はありません。

```js
const registerPurpose = ctx.getCapability("notify:registerEmailPurpose");
const purpose = await registerPurpose("digest", (variables) => ({
    subject: variables.subject,
    body: variables.body,
}));
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, variables });
```

`notify:sendEmail`には、登録済みの用途と変数を渡します。`templateId`は使用しません。用途が未指定または未登録の場合は拒否し、非同期アクションはキュー投入前に再確認します。ブートストラップの完了、失敗、タイムアウト後は登録できません。ゲートウェイの完了フックは、プロバイダーの起動後に同じ所有者の権限で実行します。

通知カテゴリには既存の`notify:registerCategory`を使用します。SMTPは登録時にキューを作成し、登録先に結び付いた配送関数をゲートウェイへ返します。ゲートウェイは送信方式に依存しません。送信時に用途を作成または推測することはなく、SMTPへの直接送信には登録済みの用途を明示する必要があります。

ゲートウェイの無効化やモジュールの解除時は、その所有者のアクションと保留中の配送を破棄します。再有効化時には新しいキューを復元し、中止したメールを再送しません。共有カテゴリは、他の登録済み所有者が有効な間は維持します。SMTP送信アダプターの無効化でもセッションを閉じて保留中の配送を中止し、再有効化では存在する登録だけを復元します。

既定の送信間隔は、各キュー内で正規化した宛先ごとに15秒です。独立したキューは並行処理し、配送成功時だけ間隔を更新します。履歴は各キューにつき完了済み200件までメモリに保持します。`sendEmail`は実際のキュー受付情報を返し、受付時点でSMTP配送の成功を示すことはありません。

送信アダプターの契約は共通の`test(recipient, config)`と、任意のブートストラップ、チャネル、ライフサイクル用フックです。ゲートウェイは`testSender(senderId, recipient, config)`を呼び出し、SMTP固有のテスト、確認、招待、ログイン用メソッドを持ちません。従来のSMTP専用ゲートウェイ補助メソッドと、独立したテンプレート登録は廃止します。

## 設定

`COGNIS_SMTP_HOST`、`COGNIS_SMTP_PORT`（587）、`COGNIS_SMTP_FROM`、必要に応じて `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS`、`COGNIS_SMTP_SECURE`（`none`、`starttls`、`tls`）を設定します。送信者名、EHLO ホスト、証明書・認証方針、コード長は既存のアダプター設定を使います。テストメールは上書き設定をキューに保持できます。

## ファクトリーと受信者のテーマ

`notify:emailTemplates` は `blocks`、`compose`、`registerFactory`、`bindFactory`、`listFactories`、`render` を提供します。標準ファクトリーは `standard`、`code`、`action`、`digest` です。モジュールはブートストラップ中に `id`、`labelKey`、`stringsBaseUrl`、型付き `options`、`render(message, { theme, variables, options })` 関数を持つ独自ファクトリーを登録できます。返されたIDには所有者が含まれます。用途登録の第3引数に `{ factory, options }` を渡します。オプションは必須値、既定値、選択肢を指定でき、不明または不正な値はキュー作成前に拒否します。段落、見出し、コード、リスト、表、区切り、HTTP(S)アクションリンクを組み立てられます。テキストをエスケープし、テンプレート置換は1回だけ行います。HTMLとプレーンテキストの内容は共通です。ブランド、ロゴ、プレビュー、フッターを設定できます。テーマは受信アカウントの `ui-preferences.mode` を使い、不明な受信者や設定がない場合はライトモードにします。呼び出し側のテーマ指定で上書きできません。無効化やブートストラップ失敗でファクトリーを削除し、失効した所有者の処理中の結果も拒否します。

```js
export async function registerReport(ctx, heading) {
    const templates = ctx
        .getCapability("system:contracts")
        .resolve("notify:emailTemplates", 1);
    const factory = await templates.registerFactory({
        id: "report",
        labelKey: "module.example.report",
        stringsBaseUrl: "/static/modules/example/languages",
        options: {
            heading: {
                type: "string",
                labelKey: "module.example.heading",
                required: true,
            },
        },
        render(message, { options }) {
            return templates.compose(message, {
                blocks: [
                    templates.blocks.heading(options.heading),
                    templates.blocks.paragraph(message.body),
                ],
            });
        },
    });
    const purpose = await ctx.getCapability("notify:registerEmailPurpose")(
        "report",
        (variables) => ({ subject: variables.subject, body: variables.body }),
        { factory, options: { heading } },
    );
    return purpose;
}
```
