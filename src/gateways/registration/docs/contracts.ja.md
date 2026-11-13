# 登録契約

登録ゲートウェイは公開登録と招待の引き換えを管理し、ゲートウェイの機能とルートを通じてプロバイダーの操作を提供します。

## 使用例

公開登録の呼び出し側は、登録済みの機能を取得します。戻り値にはusername、enabled、プロバイダーのロールが含まれます。

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## 技術仕様

招待の引き換えはPOST /api/v1/registration/redeemを使用し、token、username、passwordと任意のemail、displayNameを含むJSONオブジェクトを送信します。ゲートウェイは入力全体を招待プロバイダーに渡します。トークン検証、アカウント作成、引き換え状態の永続化はプロバイダーが担当し、失敗はルートのエラー処理に伝播します。公開登録ではregistration:public:isEnabledで利用可能性を確認し、registration:public:registerで実行します。無効なゲートウェイはgateway_disabledで実行を拒否し、公開プロバイダーが利用できない場合はpublic_disabledで拒否します。利用可能性は実行時に確認されます。ブートストラップはこれらの機能を登録し、ctxを通じて既存のgateAccountCreationとconstructRegistrationUiフローを拡張します。呼び出し側は具体的なアダプターをインポートせず、これらのインターフェースを利用します。
