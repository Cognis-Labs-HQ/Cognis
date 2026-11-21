# 使用例

外部モジュール の実践的な操作手順です。

## 前提条件

管理者は信頼できる配布元と対応する依存先を用意します。

## 使用例

設定と権限を確認して導入・有効化し、追加された画面や操作を試します。

リポジトリは `manifest.json` で安定した識別子とブートストラップのエントリーポイントを宣言します。

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

ブートストラップはスコープ付きコンテキストだけを通じて機能を提供し、所有するリソースのクリーンアップ処理を返します。

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

管理者は **モジュール** からリポジトリをインストールし、整合性と依存関係を確認して明示的に有効化します。後から無効化すると、登録済みの UI とバックエンド機能が Cognis の再起動なしで削除されます。

## 期待される結果

ルートと登録はモジュールの有効期間に属し、無効化で削除します。

## 問題の解決

パッケージ検証、依存先、ログを確認してください。機能の宣言だけで他の内部実装にはアクセスできません。
