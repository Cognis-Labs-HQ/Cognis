# 技術リファレンス

SQL を実行せず呼び出しを記録する、永続化しないテスト用データベースです。

## インターフェース

`src/adapters/db/memory/index.ts` の `MemoryDatabaseGateway` が query、execute、transaction、getQueries を実装します。getQueries は statement と任意の params を持つ読み取り専用の記録を返します。

## 設定

テスト内でインスタンスを作成します。canHandleDbProvider や createDbExecutor は公開せず、DB_TYPE=memory では標準ローダーに接続されません。

## 動作

query は記録後に `{ rows: [], rowCount: 0 }`、execute は `{ affectedRows: 0 }` を返します。transaction は同じインスタンスでコールバックを呼び、BEGIN、ロールバック、保存行は提供しません。

## セキュリティ

記録する引数に秘密情報を含めず、合成データを使ってください。認証や SQL の認可は提供しません。

## リファレンス

永続化・制約・分離の検証には実際の提供機能を使います。[データベース](/docs/gateways/db/technical)を参照してください。
