# 技術リファレンス

SQLite の公開インターフェースと運用規則を説明します。

## インターフェース

`SqliteDatabaseGateway(client)` は DatabaseGateway を実装します。SqliteClient に all(statement, params)、changes を返す run(statement, params)、exec(statement) が必要です。構造化操作は SQLite のプレースホルダーと競合句を使います。

## 設定

組み込む側がクライアントとファイルを設定します。SQLITE_PATH や標準用の実行ファクトリーは宣言せず、DB_TYPE=sqlite だけでは同梱サーバーから選べません。

## 動作

### 概要

SQLiteアダプターは、SQLiteベースのデプロイメント、ローカル開発、組み込みリレーショナルストアを必要とするテスト向けに、軽量なデータベースゲートウェイを提供します。

### 責務

- `SqliteDatabaseGateway` を通じて `DatabaseGateway` インターフェースを実装する。
- 提供されたSQLiteクライアントに対してクエリ、コマンド、トランザクションを実行する。
- SQLiteのプレースホルダー構文と競合解決構文を使う構造化データベースコマンドをサポートする。
- SQLite固有の認証スキーマヘルパーと、SQL初期化・マイグレーションスクリプトを提供する。

## セキュリティ

値をパラメーターで渡し、ファイルとバックアップを権限で保護します。呼び出し前にアプリ側の承認が必要です。

## リファレンス

- [src/adapters/db/sqlite/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/manifest.json)
- [src/adapters/db/sqlite/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/package.json)
- [src/adapters/db/sqlite/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/db/sqlite/index.ts)
