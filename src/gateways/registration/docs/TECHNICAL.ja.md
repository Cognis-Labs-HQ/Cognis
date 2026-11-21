# 技術リファレンス

登録 の公開インターフェースと運用規則を説明します。

## インターフェース

`GET /api/v1/registration/state`

`GET /api/v1/registration/policy`

`PUT /api/v1/registration/policy`

`POST /api/v1/registration/invite`

`POST /api/v1/registration/redeem`

`GET /api/v1/registration/tokens`

`POST /api/v1/registration/tokens`

## 設定

招待のポリシーと有効な登録プロバイダーにより、アカウントと招待を作成できる人を決定します。トークンと登録状態はデータベースのゲートウェイを通じて保存します。

## 動作

CLI の `invite:create`、`invite:list`、`invite:state` は、宣言された HTTP 操作を呼び出します。招待の利用では、アカウントの作成前にトークンとポリシーを検証します。

招待の引き換えはPOST /api/v1/registration/redeemを使用し、token、username、passwordと任意のemail、displayNameを含むJSONオブジェクトを送信します。ゲートウェイは入力全体を招待プロバイダーに渡します。トークン検証、アカウント作成、引き換え状態の永続化はプロバイダーが担当し、失敗はルートのエラー処理に伝播します。公開登録ではregistration:public:isEnabledで利用可能性を確認し、registration:public:registerで実行します。無効なゲートウェイはgateway_disabledで実行を拒否し、公開プロバイダーが利用できない場合はpublic_disabledで拒否します。利用可能性は実行時に確認されます。ブートストラップはこれらの機能を登録し、ctxを通じて既存のgateAccountCreationとconstructRegistrationUiフローを拡張します。呼び出し側は具体的なアダプターをインポートせず、これらのインターフェースを利用します。

## セキュリティ

状態の参照にはログインが必要です。ポリシーの管理には管理者の権限が必要で、招待の作成と一覧は現在のポリシーに従います。保留中の外部認証情報はサーバーで管理します。

## リファレンス

### 技術仕様

| ページ・画面                        | ガイド       | アクセス           |
| ----------------------------------- | ------------ | ------------------ |
| `/invite`                           | 招待の使い方 | ログイン済み利用者 |
| `/administration` · `#registration` | 登録の方針   | 管理者             |

公開機能 `ui:tutorials` を通じて、コンポーネント所有の定義、カタログ、対象、ライフサイクルのシグナルを登録します。ページ、表示中の領域、アクセス権により利用可否が決まります。コンポーネントを解除するとガイドも解除します。共通の表示と完了動作は[ホストのチュートリアル契約](/docs/tutorials)を参照してください。
