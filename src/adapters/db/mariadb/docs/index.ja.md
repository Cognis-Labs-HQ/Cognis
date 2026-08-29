# MariaDBデータベースアダプター

## 概要

MariaDBアダプターは、CognisをMariaDB（またはMySQL）データベースサーバーに接続し、マルチサーバーまたは高可用性デプロイメントに適しています。`mysql2` npmドライバーとコネクションプーリングを使用します。`DB_TYPE=mariadb` で起動します。

## 責務

- `DatabaseGateway` インターフェースを実装する: `query`、`execute`、`transaction`。
- `DATABASE_URL` 接続文字列を使用してMariaDBコネクションプールを管理する。
- `?` 位置プレースホルダーサポートを提供する。

## アーキテクチャ

`src/adapters/db/mariadb/index.ts` の `MariaDbGateway` は `mysql2` のPromiseプールを所有します。通常のクエリはプールで直接実行されます。トランザクションはコールバック用に1つの接続を予約し、その接続でコミットまたはロールバックを行い、`finally` ブロックで解放します。アダプターは ctx の `system:lifecycle` ケイパビリティにプールの排出処理を登録します。

アダプターはExecutorを公開する前にデータベースの準備状態を確認します。一時的なネットワーク障害は制限された起動時間内で再試行し、認証や設定のエラーは直ちに失敗させます。

スキーマの自己修復では、欠落した列を追加するときに外部キー句を維持し、インデックスや列の修復エラーを黙って無視せず報告します。 明示的にインデックス指定されたテキスト列には `VARCHAR(255)` を使用し、自己修復ではインデックス作成前に既存の `TEXT` 列を変換します。

### プレースホルダー構文

```sql
INSERT INTO accounts (id, email) VALUES (?, ?)
```

## 設定

| 変数                                 | デフォルト | 説明                                                         |
| ------------------------------------ | ---------- | ------------------------------------------------------------ |
| `DB_TYPE`                            | —          | このアダプターを起動するには `mariadb` である必要がある      |
| `DATABASE_URL`                       | —          | MariaDB接続URL（例: `mariadb://user:pass@host:3306/cognis`） |
| `MARIADB_POOL_MAX`                   | `10`       | プールの最大サイズ（1～100）                                 |
| `MARIADB_POOL_IDLE_TIMEOUT_MS`       | `30000`    | アイドル接続のタイムアウト（ミリ秒、1,000～600,000）         |
| `MARIADB_POOL_CONNECTION_TIMEOUT_MS` | `5000`     | 接続タイムアウト（ミリ秒、100～120,000）                     |
| `MARIADB_STARTUP_TIMEOUT_MS`         | `60000`    | 起動準備を待機する最大時間（ミリ秒、1,000～600,000）         |
| `MARIADB_STARTUP_RETRY_INTERVAL_MS`  | `1000`     | 準備確認を再試行する間隔（ミリ秒、100～30,000）              |
