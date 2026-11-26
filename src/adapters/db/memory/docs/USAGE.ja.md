# 使用例

メモリ内データベース の実践的な操作手順です。

## 前提条件

永続化やロールバックを提供しないテスト用の代替です。

## 使用例

MemoryDatabaseGateway を作成し、query または execute 後に getQueries() の statement と params を確認します。

## 期待される結果

query は空の rows と rowCount のゼロを、execute は affectedRows のゼロを返します。

## 問題の解決

DB_TYPE だけでは標準ローダーから選択できません。永続化の検証には実際のデータベースが必要です。
