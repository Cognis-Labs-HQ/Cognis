# 使用例

メール配信 の実践的な操作手順です。

## 前提条件

操作の前に、[アクセスの要件](/docs/adapters/notify/smtp)を確認してください。

## 使用例

操作する前に、インストール済みコマンドの引数をヘルプで確認してください。

```sh
cognisctl email:list --help
cognisctl email:add --help
cognisctl email:remove --help
cognisctl email:primary --help
cognisctl email:verify:send --help
```

## 期待される結果

この例は メール配信 の公開されたインターフェースを使います。書き込みを繰り返す前に、[技術情報](/docs/adapters/notify/smtp/technical)で説明する応答または保存された状態を確認してください。

## 問題の解決

メール配信 を利用できない場合は、ログイン状態を確認し、コンポーネントと依存先の有効状態を管理者に確認してもらってください。
