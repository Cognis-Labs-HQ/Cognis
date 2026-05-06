# データベースゲートウェイ

## 概要

データベースゲートウェイは、Cognisにおけるすべてのデータベース操作への単一のアクセスポイントです。SQLite、PostgreSQL、MariaDBの違いを隠す統一されたエグゼキューターインターフェースを提供します。ゲートウェイは環境から `DB_TYPE` を読み取り、適切なエグゼキューターを作成し、スキーマを初期化し、エグゼキューターとダイアレクトヘルパーをケイパビリティストアに提供します。

## 責務

- ブートストラップ時に `DB_TYPE` を読み取り、正しい `DbExecutor` インスタンスを作成する。
- アクティブなアダプターの `sql/` ディレクトリからSQLスクリプトを実行してデータベーススキーマを初期化する。
- `db:executor`、`db:type`、`db:dialect` をケイパビリティストアに提供する。
- `modules` テーブルに `cognis-core` モジュールレコードをシードする。

## アーキテクチャ

### DatabaseGatewayインターフェース

```ts
export interface DatabaseGateway {
  query<Row = Record<string, unknown>>(statement: string, params?: unknown[]): Promise<QueryResult<Row>>;
  execute(statement: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  transaction<T>(callback: (db: DatabaseGateway) => Promise<T>): Promise<T>;
}
```

### DbDialectHelper

`db:dialect` として提供される `DbDialectHelper` は2つのメソッドを提供します:

```ts
export interface DbDialectHelper {
  upsert(table: string, keyCol: string, keyVal: unknown, extraData: Record<string, unknown>): Promise<void>;
  insertIgnore(table: string, data: Record<string, unknown>): Promise<void>;
}
```

| パス | 目的 |
| ---- | ---- |
| `src/gateways/db/gateway.ts` | `DatabaseGateway` インターフェース |
| `src/gateways/db/executor.ts` | `createDbExecutor` |
| `src/gateways/db/init.ts` | `initializeDatabaseSchema` |
| `src/gateways/db/bootstrap.ts` | ブートストラップエントリポイント; `DbDialectHelper` |

## 設定

| 変数 | デフォルト | 説明 |
| ---- | ---------- | ---- |
| `DB_TYPE` | `sqlite` | データベースバックエンド: `sqlite`、`postgresql`、または `mariadb` |
| `DATABASE_URL` | — | 接続文字列; `postgresql` または `mariadb` の場合に必須 |
| `SQLITE_PATH` | `./data/cognis.sqlite` | SQLiteファイルパス; `DB_TYPE=sqlite` 時のみ使用 |
