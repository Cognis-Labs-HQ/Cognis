# 技術リファレンス

パスフレーズ機能 の公開インターフェースと運用規則を説明します。

## インターフェース

このトピックは参考情報であり、独立したエンドポイントを提供しません。例では、以下で説明するコンポーネントの公開インターフェースを使用します。

## 設定

このドキュメント自体には実行時の設定はありません。運用の設定は該当するコンポーネントが管理します。

## 動作

### パスフレーズ機能

API ランタイムは `ctx` を通じて `reuse:generatePassphrase` を提供し、Jitsi Meet などのモジュールが API 内部をインポートせずに読みやすい秘密情報を生成できるようにします。

### 使用例

モジュールのブートストラップコンテキストから capability を取得し、必要な単語数と表示形式を指定します。

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## セキュリティ

ドキュメントを読むだけでは例を実行する権限は得られません。各操作は担当するコンポーネントが認可します。

## リファレンス

### 技術仕様

この capability は、正の単語数を示す `words` と、省略可能な `separator` および `capitalization` を受け取ります。大文字・小文字の形式には `lowercase`、`uppercase`、`titlecase` を指定でき、既定では小文字の単語をハイフンで区切ります。

ジェネレーターは Node.js の暗号学的乱数を使って各単語を選択します。呼び出し元はセキュリティ要件に十分な単語数を指定し、生成したパスフレーズをログへ記録しないでください。
