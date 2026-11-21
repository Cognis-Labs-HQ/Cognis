# 使用例

登録 の実践的な操作手順です。

## 前提条件

所有者が招待方針を管理し、発行はロールと有効な提供機能に従います。

## 使用例

方針を確認して招待を発行し、宛先のメールで登録します。公開フォームは公開登録が有効な場合に使います。

公開登録の呼び出し側は、登録済みの機能を取得します。戻り値にはusername、enabled、プロバイダーのロールが含まれます。

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## 期待される結果

有効な方式と方針で作成し、保存に失敗しても招待は使用済みになりません。

## 問題の解決

期限、メールの一致、発行上限を確認してください。外部ログインでも登録承認は省略できません。
