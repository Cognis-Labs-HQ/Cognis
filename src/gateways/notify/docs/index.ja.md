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

| メソッド | パス                                               | 説明                           | 認証     |
| -------- | -------------------------------------------------- | ------------------------------ | -------- |
| `POST`   | `/api/v1/notifications/send`                       | 通知を配信                     | 管理者   |
| `GET`    | `/api/v1/notifications/providers`                  | 登録済み送信者を一覧表示       | ユーザー |
| `GET`    | `/api/v1/notifications/categories`                 | 通知カテゴリを一覧表示         | Bearer   |
| `GET`    | `/api/v1/notifications/preferences`                | 自分の通知設定を取得           | Bearer   |
| `PUT`    | `/api/v1/notifications/preferences`                | 自分の通知設定を更新           | Bearer   |
| `POST`   | `/api/v1/notifications/providers/:senderId/config` | 送信者設定を更新               | 管理者   |
| `POST`   | `/api/v1/notifications/providers/:senderId/test`   | テスト通知を送信               | 管理者   |
| `POST`   | `/api/v1/users/tfa/request`                        | TFAコードを要求                | Bearer   |
| `POST`   | `/api/v1/users/tfa/verify`                         | TFAコードを検証                | Bearer   |
| `POST`   | `/api/v1/users/email/verify/request`               | メール検証を要求               | Bearer   |
| `POST`   | `/api/v1/users/email/verify`                       | メール検証を完了               | Bearer   |
| `GET`    | `/api/v1/users/:username/email`                    | ユーザーのメールアドレスを取得 | Bearer   |
| `PUT`    | `/api/v1/users/:username/email`                    | ユーザーのメールアドレスを設定 | Bearer   |
