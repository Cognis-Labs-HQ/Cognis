# コンポーネントバージョン

## 概要

このドキュメントはCognisコードベース内のすべてのゲートウェイ、アダプター、モジュールの現在のバージョンを追跡します。Changelogインデックスと迅速なリファレンスとして機能します。

すべてのゲートウェイ、アダプター、モジュールは `version` フィールドを持つ `package.json` を持ちます。コンポーネントを変更する際は、Semantic Versioningに従って `package.json` のバージョンを増分する必要があります。

## アダプター

| コンポーネント             | パス                        | バージョン |
| -------------------------- | --------------------------- | ---------- |
| SMTP通知                   | `src/adapters/notify/smtp/` | `0.1.0`    |
| ローカルファイルストレージ | `src/adapters/file/local/`  | `0.1.0`    |
| ローカル認証               | `src/adapters/auth/local/`  | `0.2.0`    |
| SQLiteデータベース         | `src/adapters/db/sqlite/`   | `0.1.0`    |
| PostgreSQLデータベース     | `src/adapters/db/postgres/` | `0.1.0`    |
| MariaDBデータベース        | `src/adapters/db/mariadb/`  | `0.1.0`    |

## ゲートウェイ

| コンポーネント             | パス                    | バージョン |
| -------------------------- | ----------------------- | ---------- |
| データベース (db)          | `src/gateways/db/`      | `1.1.0`    |
| 認証 (auth)                | `src/gateways/auth/`    | `1.1.0`    |
| 通知 (notify)              | `src/gateways/notify/`  | `0.1.0`    |
| プロフィール               | `src/gateways/profile/` | `1.1.0`    |
| ファイルストレージ (files) | `src/gateways/files/`   | `1.1.0`    |
| ログ記録                   | `src/gateways/logging/` | `1.1.0`    |

## モジュール

| コンポーネント | パス                            | バージョン |
| -------------- | ------------------------------- | ---------- |
| サンプル分析   | `src/modules/sample-analytics/` | `0.1.0`    |
