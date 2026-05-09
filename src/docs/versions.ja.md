# コンポーネントバージョン

## 概要

このドキュメントはCognisコードベース内のすべてのゲートウェイ、アダプター、モジュールの現在のバージョンを追跡します。Changelogインデックスと迅速なリファレンスとして機能します。

すべてのゲートウェイ、アダプター、モジュールは `version` フィールドを持つ `package.json` を持ちます。コンポーネントを変更する際は、Semantic Versioningに従って `package.json` のバージョンを増分する必要があります。

## アダプター

| コンポーネント             | パス                                | バージョン |
| -------------------------- | ----------------------------------- | ---------- |
| SMTP通知                   | `src/adapters/notify/smtp/`         | `0.1.0`    |
| 内部通知                   | `src/adapters/notify/internal/`     | `0.5.0`    |
| ローカルファイルストレージ | `src/adapters/file/local/`          | `0.1.0`    |
| ローカル認証               | `src/adapters/auth/local/`          | `0.2.2`    |
| SQLiteデータベース         | `src/adapters/db/sqlite/`           | `0.1.0`    |
| PostgreSQLデータベース     | `src/adapters/db/postgres/`         | `0.1.0`    |
| MariaDBデータベース        | `src/adapters/db/mariadb/`          | `0.1.0`    |
| 登録招待                   | `src/adapters/registration/invite/` | `0.1.1`    |
| 登録トークン               | `src/adapters/registration/token/`  | `0.1.1`    |
| 公開登録                   | `src/adapters/registration/public/` | `0.1.0`    |

## ゲートウェイ

| コンポーネント             | パス                         | バージョン |
| -------------------------- | ---------------------------- | ---------- |
| データベース (db)          | `src/gateways/db/`           | `1.1.2`    |
| 認証 (auth)                | `src/gateways/auth/`         | `1.3.2`    |
| 通知 (notify)              | `src/gateways/notify/`       | `1.1.1`    |
| プロフィール               | `src/gateways/profile/`      | `1.1.1`    |
| ファイルストレージ (files) | `src/gateways/files/`        | `1.1.0`    |
| 登録                       | `src/gateways/registration/` | `1.1.2`    |
| ログ記録                   | `src/gateways/logging/`      | `1.4.0`    |

## API

| コンポーネント | パス       | バージョン |
| -------------- | ---------- | ---------- |
| APIサーバー    | `src/api/` | `0.1.3`    |

## モジュール

| コンポーネント | パス                            | バージョン |
| -------------- | ------------------------------- | ---------- |
| サンプル分析   | `src/modules/sample-analytics/` | `0.1.0`    |
