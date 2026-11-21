# 使用例

パスフレーズ機能 の実践的な操作手順です。

## 前提条件

対応する機能の生成操作が必要で、専用の利用画面はありません。

## 使用例

生成後は担当機能の安全な仕組みで保存し、意図した参加者だけに伝えます。

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

モジュールのブートストラップコンテキストから capability を取得し、必要な単語数と表示形式を指定します。

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## 期待される結果

独立に選んだ単語を組み合わせ、生成だけでは保存・配信・アクセス承認は行いません。

## 問題の解決

生成と保存は別です。連携する開発者は単語数や区切りの契約を確認してください。
