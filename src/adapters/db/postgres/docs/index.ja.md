# PostgreSQLデータベースアダプター

## 概要

PostgreSQLアダプターは、CognisをPostgreSQLデータベースサーバーに接続します。`pg` npmドライバーを使用し、高度なSQL機能、全文検索、またはAmazon RDS、Google Cloud SQL、SupabaseなどのマネージドPostgreSQLサービスを必要とする本番デプロイメントに推奨されます。`DB_TYPE=postgresql` で起動します。

## 責務

- `DatabaseGateway` インターフェースを実装する: `query`、`execute`、`transaction`。
- `DATABASE_URL` 接続文字列を使用してPostgreSQLコネクションプールを管理する。
- `$1`、`$2`、…位置プレースホルダーサポートを提供する。

## アーキテクチャ

`src/adapters/db/postgres/index.ts` の `PostgresDbGateway` は `pg.Pool` を所有します。通常のクエリはプールで直接実行されます。トランザクションは `BEGIN`、コールバック内の全ステートメント、`COMMIT` または `ROLLBACK` に同じクライアントを使用し、最後に解放します。アダプターは ctx の `system:lifecycle` ケイパビリティにプールの排出処理を登録し、サーバー終了時に接続を閉じます。

スキーマの自己修復では、欠落した列を追加するときに外部キー句を維持し、インデックスや列の修復エラーを黙って無視せず報告します。

### プレースホルダー構文

PostgreSQLは番号付きの `$N` プレースホルダーを使用します:

```sql
INSERT INTO accounts (id, email) VALUES ($1, $2)
```

## 設定

| 変数                                  | デフォルト | 説明                                                               |
| ------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `DB_TYPE`                             | —          | このアダプターを起動するには `postgresql` である必要がある         |
| `DATABASE_URL`                        | —          | PostgreSQL接続URL（例: `postgresql://user:pass@host:5432/cognis`） |
| `POSTGRES_POOL_MAX`                   | `10`       | プールの最大サイズ（1～100）                                       |
| `POSTGRES_POOL_IDLE_TIMEOUT_MS`       | `30000`    | アイドルクライアントのタイムアウト（ミリ秒、1,000～600,000）       |
| `POSTGRES_POOL_CONNECTION_TIMEOUT_MS` | `5000`     | 接続タイムアウト（ミリ秒、100～120,000）                           |
| `POSTGRES_POOL_STATEMENT_TIMEOUT_MS`  | —          | 任意のステートメントタイムアウト（ミリ秒、1～3,600,000）           |

## スキーマの整合

PostgreSQL はスキーマ初期化時に既存の主キーを現在のテーブル宣言と整合させます。行は保持され、互換性のない宣言はデータを破棄せずエラーになります。変更は記録されます。バージョン固有の移行や列名変更の互換処理は使用しません。

一意制約と通常の一意インデックスも同じトランザクションで宣言された一意キーと整合させます。テーブル宣言を正とし、式インデックスと部分インデックスは独立して管理します。
