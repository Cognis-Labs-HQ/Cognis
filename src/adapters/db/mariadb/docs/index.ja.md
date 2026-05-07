# MariaDBデータベースアダプター

## 概要

MariaDBアダプターは、CognisをMariaDB（またはMySQL）データベースサーバーに接続し、マルチサーバーまたは高可用性デプロイメントに適しています。`mariadb` npmドライバーとコネクションプーリングを使用します。`DB_TYPE=mariadb` で起動します。

## 責務

- `DatabaseGateway` インターフェースを実装する: `query`、`execute`、`transaction`。
- `DATABASE_URL` 接続文字列を使用してMariaDBコネクションプールを管理する。
- `?` 位置プレースホルダーサポートを提供する。

## アーキテクチャ

`src/adapters/db/mariadb/adapter.ts` の `MariaDbGateway` は起動時にコネクションプールを作成します。

### プレースホルダー構文

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

## 設定

| 変数 | デフォルト | 説明 |
| ---- | ---------- | ---- |
| `DB_TYPE` | — | このアダプターを起動するには `mariadb` である必要がある |
| `DATABASE_URL` | — | MariaDB接続URL（例: `mariadb://user:pass@host:3306/cognis`） |
