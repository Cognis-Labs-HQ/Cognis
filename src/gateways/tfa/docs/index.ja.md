# TFA Gateway

## 概要

TFA Gateway は Cognis の二要素認証全体を担当します。`src/adapters/tfa/` 配下の方式アダプターを発見し、アダプター状態と復旧コードを永続化し、ユーザーに設定が必須かどうかを判断し、ログイン時の第二要素を検証します。

Auth Gateway は TOTP や将来の方式の詳細を知りません。一次認証だけを担当し、その後は TFA Gateway が公開する capability を利用します。

## 責務

- `src/adapters/tfa/*` から TFA アダプターを検出する。
- アダプター設定と有効/無効状態を保存する。
- 管理者が無効化したアダプターを再起動時に勝手に再有効化しない。
- 設定開始、有効化/無効化、優先順、復旧コードの route を提供する。
- 全ユーザー強制設定が有効なときに設定必須状態を適用する。
- ログインチャレンジを検証し、復旧コードを原子的に消費する。
- TFA 所有の settings/admin UI と静的アセットを登録する。
- 複数の方式が利用可能な場合、チャレンジの開始（SMTP メール送信など）をユーザーが方式を明示的に選択するまで遅延させる。

この gateway の責務ではないもの: 一次認証、パスワードポリシー、アカウント作成。

## アーキテクチャ

`src/gateways/tfa/gateway.ts` には `CoreTfaGateway` が定義されています。このクラスはアダプター registry を保持し、方式固有の setup / verify をアダプターへ委譲しつつ、優先方式順序、復旧コード、全体 enforcement などの共通ポリシーを集中管理します。

`src/gateways/tfa/bootstrap.ts` の bootstrap 手順:

1. `DbTfaStore` を作成して schema を保証する。
2. `src/adapters/tfa/` を走査してアダプターを検出する。
3. 永続化済み設定を読み込む。
4. API route と adapter admin route を登録する。
5. TFA 所有の settings/admin UI を登録する。
6. auth や他 gateway 向けの TFA capability を登録する。

## Capability

この gateway は `ctx.capabilities` に次を登録します。

- `tfa:getUserStatus(accountId)`
- `tfa:getLoginMethods(accountId)`
- `tfa:verifyLogin(accountId, methodId, payload)`
- `tfa:isSecondFactorEnabled(accountId)`
- `tfa:isSetupRequired(accountId)`
- `tfa:resetUser(accountId)`
- `tfa:getEnforceAllUsers()`
- `tfa:setEnforceAllUsers(required)`

これらが正式な統合面です。他コンポーネントが TFA アダプター内部を直接 import してはいけません。

`tfa:getLoginMethods(accountId)` がログインチャレンジ（SMTP メール送信など）を開始するのは、ユーザーに設定済み方式がちょうど 1 つの場合のみです。複数の方式がある場合、レスポンスには方式の識別情報のみが含まれ、チャレンジデータは返されません。ログイン UI はユーザーが方式を明示的に選択したときに `POST /api/v1/tfa/login/resend` を通じてオンデマンドでチャレンジを開始します。

## API Route

| メソッド | パス                                   | 説明                              | 認証   |
| -------- | -------------------------------------- | --------------------------------- | ------ |
| `GET`    | `/api/v1/tfa/status`                   | 現在ユーザーの設定必須状態を読む  | Bearer |
| `GET`    | `/api/v1/tfa/methods`                  | 方式一覧と復旧コード情報を読む    | Bearer |
| `POST`   | `/api/v1/tfa/methods/:id/setup/begin`  | 方式設定を開始する                | Bearer |
| `POST`   | `/api/v1/tfa/methods/:id/setup/verify` | 設定を検証する                    | Bearer |
| `POST`   | `/api/v1/tfa/methods/:id/setup/cancel` | 設定を中止する                    | Bearer |
| `POST`   | `/api/v1/tfa/methods/:id/enable`       | 保存済み方式を再有効化する        | Bearer |
| `POST`   | `/api/v1/tfa/methods/:id/disable`      | 方式を無効化する                  | Bearer |
| `PUT`    | `/api/v1/tfa/methods/preferences`      | 優先方式順序を保存する            | Bearer |
| `GET`    | `/api/v1/tfa/recovery-codes`           | 復旧コード状態を読む              | Bearer |
| `POST`   | `/api/v1/tfa/recovery-codes/rotate`    | 復旧コードを置き換える            | Bearer |
| `POST`   | `/api/v1/tfa/admin/users/:id/reset`    | ユーザーの TFA 状態をリセットする | Admin  |
| `GET`    | `/api/v1/gateways/tfa/adapters`        | 登録済みアダプター一覧            | Admin  |

## UI 所有範囲

TFA のブラウザー資産は `src/gateways/tfa/ui/` に置かれます。この gateway が自分の settings section、administration section、静的アセット配信を自分で登録します。TOTP 固有の文言は `src/adapters/tfa/totp/languages/` に残します。

## Adapter 契約

各 `src/adapters/tfa/<adapter-id>/` は方式固有の setup と verify を実装します。復旧コード、優先順序、全体 enforcement のような共通フローは gateway に残し、新しい方式を追加してもポリシーが重複しないようにします。
