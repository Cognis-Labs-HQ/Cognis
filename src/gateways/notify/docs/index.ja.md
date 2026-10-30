# 通知ゲートウェイ

## 概要

通知ゲートウェイは、プラグイン可能な送信者アダプターを通じて通知を配信します。アプリケーションの残りの部分と具体的な配信メカニズム（SMTP、将来のウェブフック、アプリ内通知など）の間のブローカーとして機能し、どのトランスポートが設定されているかを知る必要がありません。

ゲートウェイはまた、2要素認証コードの発行・検証のための `TfaCodeService` とメール検証フローのための `VerifyTokenService` という2つの特化サービスも所有しています。送信者アダプターはブートストラップ時に `src/adapters/notify/` をスキャンして検出されます。SMTPアダプターは唯一の組み込み送信者で、`COGNIS_SMTP_HOST` が設定されると自動的に起動します。

## 責務

- ブートストラップ時に `src/adapters/notify/` から通知送信者アダプターを検出・登録する。
- 受信者とカテゴリに対して有効なすべての送信者に通知エンベロープを配信する。
- 送信者設定をデータベースに永続化して再読み込みする。
- `system` 通知カテゴリを登録する。
- TFAコード発行・検証ルートを接続する。
- メール検証トークンルートを接続する。

## アーキテクチャ

中心クラスは `src/gateways/notify/gateway.ts` の `CoreNotificationGateway` です。

```ts
export interface NotificationGateway {
    registerSender(sender: NotificationSender): void;
    dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
    registerCategory(id: string, label: string): void;
    listSenders(): NotificationSenderInfo[];
    listCategories(): NotificationCategory[];
}
```

| パス                                          | 目的                                        |
| --------------------------------------------- | ------------------------------------------- |
| `src/gateways/notify/gateway.ts`              | `CoreNotificationGateway`、インターフェース |
| `src/gateways/notify/bootstrap.ts`            | ブートストラップエントリポイント            |
| `src/gateways/notify/routes/notifications.ts` | 配信・管理ルート                            |
| `src/api/reuse/tfa-code.ts`                   | `TfaCodeService`                            |
| `src/api/reuse/verify-token.ts`               | `VerifyTokenService`                        |

## APIルート

| メソッド | パス                                        | 説明                           | 認証     |
| -------- | ------------------------------------------- | ------------------------------ | -------- |
| `POST`   | `/api/v1/notify/send`                       | 通知を配信                     | 管理者   |
| `GET`    | `/api/v1/notify/providers`                  | 登録済み送信者を一覧表示       | ユーザー |
| `GET`    | `/api/v1/notify/categories`                 | 通知カテゴリを一覧表示         | Bearer   |
| `GET`    | `/api/v1/notify/preferences`                | 自分の通知設定を取得           | Bearer   |
| `PUT`    | `/api/v1/notify/preferences`                | 自分の通知設定を更新           | Bearer   |
| `POST`   | `/api/v1/notify/providers/:senderId/config` | 送信者設定を更新               | 管理者   |
| `POST`   | `/api/v1/notify/providers/:senderId/test`   | テスト通知を送信               | 管理者   |
| `POST`   | `/api/v1/users/tfa/request`                 | TFAコードを要求                | Bearer   |
| `POST`   | `/api/v1/users/tfa/verify`                  | TFAコードを検証                | Bearer   |
| `POST`   | `/api/v1/users/email/verify/request`        | メール検証を要求               | Bearer   |
| `POST`   | `/api/v1/users/email/verify`                | メール検証を完了               | Bearer   |
| `GET`    | `/api/v1/users/:username/email`             | ユーザーのメールアドレスを取得 | Bearer   |
| `PUT`    | `/api/v1/users/:username/email`             | ユーザーのメールアドレスを設定 | Bearer   |

## メールアドレス確認

SMTP による確認は SSO とローカルの両アカウントに適用されます。再送には設定済みの通知配信サービスを使います。確認コードとリンクは、名前空間を含む SSO ID も含め、完全なアカウント ID とメールアドレスの組に結び付けられます。設定画面で確認を取り消しても既存のメールアドレスは保持されます。

## 共通の最上部バナー

オフラインモードと Broadcast は、アプリのヘッダーより上の文書最上部に共通の固定バナースタックを表示します。オフラインモードを優先し、閉じる操作は設けず、接続再確認と復旧後の更新操作を維持します。お知らせを削除してもオフライン表示は消えません。Broadcast は切断中の通信を省略し、プロバイダーの終了時にバナーとタイマーを解放します。

## 個人設定のオフライン対応

認証済みログイン時に、設定画面を開かずにメール一覧と信頼済みドメインの方針を準備します。アドレスの追加、削除、主要アドレス変更はローカル表示に反映し、`notify:emailClient` と保護対象の `notify.emails` キュー所有者を通して保存します。最終的な検証はサーバーが行います。メール確認、再送、アカウントの削除や無効化には接続が必要で、確認コード、監視トークン、パスワードはキューに含めません。追加したアドレスはオンライン確認が済むまで未確認のままです。送信成功時にはメールのスナップショットを更新し、任意の再取得に失敗しても保存済みの操作を失敗扱いにしません。容量を制限した非公開スナップショットはタブとセッションに紐付きます。

## セッションとコンポーネントの分離

ライフサイクルに従う`notify:emailClient`機能は、自分のアカウントへのリクエストと信頼済みドメイン、管理者向け`listUserEmails`、オンライン専用`resendUserEmail`、`smtpAvailable`を提供します。各操作は登録されたステージを実行し、プロバイダーの破棄時に停止します。設定、ユーザー管理、管理画面はNotifyのUI実装をインポートせず、ctx経由でこれらのメソッドを解決します。Notifyが利用できない場合はメール管理を非表示にし、他のアカウント操作は利用可能なままにします。

## アカウントIDによる通知配信

ロール宛ての通知とStudy Libraryの申請・コンテンツ通知は、不変の `accountId` を宛先に使用します。公開ユーザー名が異なるSSOユーザーにも配信できます。申請の判断では同じIDで操作したアカウントを除外し、公開ユーザー名は表示用データとして扱います。
