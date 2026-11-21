# 使用例

学習の進み具合 の実践的な操作手順です。

## 前提条件

操作の前に、[アクセスの要件](/docs/adapters/study/progress)を確認してください。

## 使用例

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## 期待される結果

この例は 学習の進み具合 の公開されたインターフェースを使います。書き込みを繰り返す前に、[技術情報](/docs/adapters/study/progress/technical)で説明する応答または保存された状態を確認してください。

## 問題の解決

学習の進み具合 を利用できない場合は、ログイン状態を確認し、コンポーネントと依存先の有効状態を管理者に確認してもらってください。
