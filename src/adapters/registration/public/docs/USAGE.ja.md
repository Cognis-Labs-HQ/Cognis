# 使用例

公開登録 の実践的な操作手順です。

## 前提条件

管理者が公開登録を明示的に有効にする必要があります。

## 使用例

ユーザー名とパスワード、必要ならメールと表示名を入力して送信します。

別のコンポーネントからアダプターを直接呼び出すのではなく、ゲートウェイの機能を取得して登録します。

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## 期待される結果

有効な入力で一般ユーザーを作成し、管理者権限を要求することはできません。

## 問題の解決

拒否されたら必須項目、名前の利用可否、公開登録の方針を確認してください。
