# 使用例

パスフレーズ機能 の実践的な操作手順です。

## 前提条件

操作の前に、[アクセスの要件](/docs/passphrase-utility)を確認してください。

## 使用例

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## 期待される結果

この例は パスフレーズ機能 の公開されたインターフェースを使います。書き込みを繰り返す前に、[技術情報](/docs/passphrase-utility/technical)で説明する応答または保存された状態を確認してください。

## 問題の解決

パスフレーズ機能 を利用できない場合は、ログイン状態を確認し、コンポーネントと依存先の有効状態を管理者に確認してもらってください。
