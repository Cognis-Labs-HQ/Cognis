# 使用例

DevOps の実践的な操作手順です。

## 前提条件

操作の前に、[アクセスの要件](/docs/devops)を確認してください。

## 使用例

```sh
export POSTGRES_PASSWORD='<データベースパスワード>'
export DATA_ENCRYPTION_KEY='<64 文字の暗号化キー>'
docker compose up --build
```

## 期待される結果

この例は DevOps の公開されたインターフェースを使います。書き込みを繰り返す前に、[技術情報](/docs/devops/technical)で説明する応答または保存された状態を確認してください。

## 問題の解決

DevOps を利用できない場合は、ログイン状態を確認し、コンポーネントと依存先の有効状態を管理者に確認してもらってください。
