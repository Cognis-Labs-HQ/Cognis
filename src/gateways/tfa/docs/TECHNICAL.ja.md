# 技術リファレンス

二要素認証 の公開インターフェースと運用規則を説明します。

## インターフェース

### アーキテクチャ

`src/gateways/tfa/gateway.ts` には `CoreTfaGateway` が定義されています。このクラスはアダプター registry を保持し、方式固有の setup / verify をアダプターへ委譲しつつ、優先方式順序、復旧コード、全体 enforcement などの共通ポリシーを集中管理します。

`src/gateways/tfa/bootstrap.ts` の bootstrap 手順:

1. `DatabaseTfaStore` を作成して schema を保証する。
2. `src/adapters/tfa/` を走査してアダプターを検出する。
3. 永続化済み設定を読み込む。
4. API route と adapter admin route を登録する。
5. TFA 所有の settings/admin UI を登録する。
6. auth や他 gateway 向けの TFA capability を登録する。

### Capability

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

`tfa:getLoginMethods(accountId)` は利用可能な方式が1つで未使用の復旧コードがない場合のみチャレンジを準備します。それ以外では、ログイン画面が `challengeOnSelect` を持つ初期選択方式と、既存のチャレンジがない後続の選択に対し `POST /api/v1/tfa/login/resend` でチャレンジを要求します。サーバー側で準備済みのチャレンジは再利用します。配送の失敗は選択言語で表示し、ログには方式、アカウント、準備状態、失敗理由を記録します。コードやメール本文は記録しません。

### API Route

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

### Adapter 契約

各 `src/adapters/tfa/<adapter-id>/` は方式固有の setup と verify を実装します。復旧コード、優先順序、全体 enforcement のような共通フローは gateway に残し、新しい方式を追加してもポリシーが重複しないようにします。

## 設定

方式が設定・ログイン表示と設定項目を宣言します。アカウントが確認済み方式を管理し、利用可能な提供元に従って追加や確認を行います。

## 動作

入力画面はチャレンジの配送完了前にログイン試行IDを返すため、メール待機中も認証アプリと復旧コードで検証できます。初回送信と再送の要求には15秒の期限があります。同じ方式の配送待機中は重複要求を開始しません。新しい入力画面を開くと前の要求を中止し、再送処理を置き換えます。遅延した応答は新しい画面や選択方式を変更しません。

### TFA Gateway

言語リソースは固定の一覧ではなくインストール済みの認証方式から検出します。方式は共通のエラー契約で `invalid_verification_code` を返し、発行元固有の設定はアダプターが所有します。

コード入力前であっても未完了の設定を直ちに保護します。背景クリック、Escape、閉じる、キャンセル、SPA 遷移では共通の破棄確認を使い、編集を続ける場合はフォーカスを戻します。遷移は設定のキャンセルが完了してから再開します。再読み込みにはブラウザーの退出警告を使います。設定セクションの破棄時にはイベント処理とポップアップを削除します。必須の認証設定は引き続きサーバーで強制します。

### 概要

TFA Gateway は Cognis の二要素認証全体を担当します。`src/adapters/tfa/` 配下の方式アダプターを発見し、アダプター状態と復旧コードを永続化し、ユーザーに設定が必須かどうかを判断し、ログイン時の第二要素を検証します。

Auth Gateway は TOTP や将来の方式の詳細を知りません。一次認証だけを担当し、その後は TFA Gateway が公開する capability を利用します。

### 責務

- `src/adapters/tfa/*` から TFA アダプターを検出する。
- アダプター設定と有効/無効状態を保存する。
- 管理者が無効化したアダプターを再起動時に勝手に再有効化しない。
- 設定開始、有効化/無効化、優先順、復旧コードの route を提供する。
- 全ユーザー強制設定が有効なときに設定必須状態を適用する。
- ログインチャレンジを検証し、復旧コードを原子的に消費する。
- TFA 所有の settings/admin UI と静的アセットを登録する。
- 複数の方式が利用可能な場合、チャレンジの開始（SMTP メール送信など）をユーザーが方式を明示的に選択するまで遅延させる。

この gateway の責務ではないもの: 一次認証、パスワードポリシー、アカウント作成。

### UI 所有範囲

TFA のブラウザー資産は `src/gateways/tfa/ui/` に置かれます。この gateway が自分の settings section、administration section、静的アセット配信を自分で登録します。TOTP 固有の文言は `src/adapters/tfa/totp/languages/` に残します。

### TFA破棄確認の段階的処理

登録の中止がサーバーで確認された後、残りのページ保護機能にもナビゲーションを確認させます。登録を破棄しても、無関係な設定変更は破棄しません。変更を保持すると移動を停止し、明示的に破棄した場合だけ続行します。破棄済みのページから保存していた登録中のナビゲーションを再開することはできません。

### メソッドの表示

各メソッドは `stringsBaseUrl` と `loginUi` の `placeholderKey`、`supportsResend`、`challengeOnSelect` を提供します。ログイン画面はプロバイダーIDで分岐せず、このメタデータを使います。設定ラベルは提供元の翻訳キーです。

アダプター契約の登録は[共通ゲートウェイブートストラップ契約](/docs/gateways)に従います。

### アダプター管理の操作

管理者専用のアダプターカタログ `GET /api/v1/gateways/tfa/adapters` は、各方式の `config`、`enable`、`disable` エンドポイントを公開します。コンポーネントのライフサイクルコマンドは、単体操作と一括操作の両方で、ルートを推測せずに公開された操作を使用します。ゲートウェイはカタログと各操作で管理者権限を確認します。このゲートウェイはテスト操作を実装していないため、各方式もテスト操作を公開しません。

## セキュリティ

設定・確認・削除・ログイン検証には保護された処理を使います。方式ごとに確認を検証し、未確認の方式や失敗を成功として扱いません。

## リファレンス

### 技術仕様

| ページ・画面                           | ガイド               | アクセス           |
| -------------------------------------- | -------------------- | ------------------ |
| `/settings` · `#tfa-settings-panel`    | 二要素認証           | ログイン済み利用者 |
| `/administration` · `#tfa-enforcement` | 二要素認証の必須設定 | 管理者             |

公開機能 `ui:tutorials` を通じて、コンポーネント所有の定義、カタログ、対象、ライフサイクルのシグナルを登録します。ページ、表示中の領域、アクセス権により利用可否が決まります。コンポーネントを解除するとガイドも解除します。共通の表示と完了動作は[ホストのチュートリアル契約](/docs/tutorials)を参照してください。

第2認証要素が使えない場合のログイン方法としてリカバリーコードを説明し、強制設定ではパネル全体ではなくスイッチを示します。
