# メモリデータベースアダプター

## 概要

メモリアダプターは、実際のデータベースが関与すべきでない自動テストやCIパイプラインで使用するためのno-opデータベース実装です。すべてのクエリは空の結果セットを返し、すべてのexecuteはサイレントなno-opです。発行されたすべてのSQL文は `queryLog` に記録されるため、テストで期待するSQLが生成されたことをアサートしやすいです。

メモリアダプターは本番デプロイメントでは絶対に使用しないでください。

## 責務

- `DatabaseGateway` インターフェースを実装する: `query`、`execute`、`transaction`。
- すべてのSQL文とパラメーターを `queryLog` に記録する。
- すべての `query()` 呼び出しに対して空の結果セット（`[]`）を返す。
- すべての `execute()` 呼び出しに対して何もしない。

## アーキテクチャ

```ts
const db = new MemoryDatabaseGateway();
await db.execute("INSERT INTO users (id) VALUES (?)", ["u1"]);
console.log(db.queryLog);
// [{ sql: 'INSERT INTO users (id) VALUES (?)', params: ['u1'] }]
```

## 設定

| 変数      | デフォルト | 説明                                                   |
| --------- | ---------- | ------------------------------------------------------ |
| `DB_TYPE` | —          | このアダプターを起動するには `memory` である必要がある |
