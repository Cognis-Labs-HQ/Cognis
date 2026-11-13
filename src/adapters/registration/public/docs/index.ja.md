# 公開登録

公開登録は、有効な登録プロバイダーを通じてアカウントを作成し、注入された機能を通じてプロフィールも作成できます。

## 使用例

別のコンポーネントからアダプターを直接呼び出すのではなく、ゲートウェイの機能を取得して登録します。

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## 技術仕様

アダプターはusername、password、任意のemailとdisplayNameを受け取ります。usernameとdisplayNameの前後の空白を除き、空のユーザー名またはパスワードをusername_and_password_requiredで拒否し、userロールでアカウントストアを呼び出します。戻り値にはusername、enabled、roleが含まれます。永続化はアカウントストアが担当し、失敗は呼び出し側に伝播します。createProfileが提供されていれば、アカウント作成後にプロフィール作成の完了を待ちます。アダプターは初期状態では無効で、ゲートウェイが公開登録ポリシーを確認し、無効な登録を拒否します。任意のメールアドレスは入力契約の一部ですが、アカウント登録操作には渡されません。
