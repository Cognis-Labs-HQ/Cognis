# 使用例

DevOps の実践的な操作手順です。

## 前提条件

Docker Compose と配置環境が管理するデータベース認証情報、暗号鍵を用意します。

## 使用例

POSTGRES_PASSWORD と DATA_ENCRYPTION_KEY を渡し、`docker compose up --build` 後に正常性とログを確認します。

```sh
export POSTGRES_PASSWORD='<データベースパスワード>'
export DATA_ENCRYPTION_KEY='<64 文字の暗号化キー>'
docker compose up --build
```

## 期待される結果

nginx の背後で設定済みデータベースに接続し、必須の秘密情報がなければ起動を拒否します。

## 問題の解決

Compose のエラー、接続、マウント先の権限を確認し、更新前にデータベースとメディアを一緒に保存してください。
