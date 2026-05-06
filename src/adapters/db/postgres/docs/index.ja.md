# PostgreSQLデータベースアダプター

## 概要

PostgreSQLアダプターは、CognisをPostgreSQLデータベースサーバーに接続します。`pg` npmドライバーを使用し、高度なSQL機能、全文検索、またはAmazon RDS、Google Cloud SQL、SupabaseなどのマネージドPostgreSQLサービスを必要とする本番デプロイメントに推奨されます。`DB_TYPE=postgresql` で起動します。

## 責務

- `DatabaseGateway` インターフェースを実装する: `query`、`execute`、`transaction`。
- `DATABASE_URL` 接続文字列を使用してPostgreSQLコネクションプールを管理する。
- `$1`、`$2`、…位置プレースホルダーサポートを提供する。

## アーキテクチャ

`src/adapters/db/postgres/adapter.ts` の `PostgresDbGateway` は起動時に `pg.Pool` を作成します。

### プレースホルダー構文

PostgreSQLは番号付きの `$N` プレースホルダーを使用します:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## 設定

| 変数 | デフォルト | 説明 |
| ---- | ---------- | ---- |
| `DB_TYPE` | — | このアダプターを起動するには `postgresql` である必要がある |
| `DATABASE_URL` | — | PostgreSQL接続URL（例: `postgresql://user:pass@host:5432/cognis`） |
