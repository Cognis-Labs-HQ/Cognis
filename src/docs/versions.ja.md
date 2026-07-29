<!-- Keep all src/docs/versions.*.md language variants in sync when updating this file. -->

# コンポーネントバージョン

## 概要

このドキュメントは、Cognis コードベース内のすべてのゲートウェイ、アダプター、モジュールの現在バージョンを追跡します。これは changelog の索引であり、以前のリリース以降にコンポーネントが更新されたかを判断するためのクイックリファレンスです。

各ゲートウェイ、アダプター、モジュールは `version` フィールドを持つ `package.json` を備えています。内部ロジック、データベーススキーマ、公開 API、設定形式など、そのコンポーネントを変更する場合は、Semantic Versioning に従って `package.json` のバージョンを上げる必要があります。このドキュメントも同時に更新します。changelog エントリは `src/docs/changelog/` 配下の PR ごとのファイルとして保存されます。

## 責務

- コードベース内のバージョン管理された各コンポーネントの現在バージョンを記録する。
- changelog 索引として、コンポーネントごとのドキュメントと履歴用の `src/docs/changelog/` へ導く。
- デプロイ済みコンポーネントと現在のコードベースとのバージョンドリフトを検出しやすくする。

責務外: バージョン上げの強制（これはコードレビューの対象）や外部パッケージのバージョン追跡。

## バージョニング規則

[Semantic Versioning](https://semver.org/) に従って増分します:

- **Patch** (`0.1.x`): バグ修正、破壊的でない内部変更。
- **Minor** (`0.x.0`): 後方互換性のある新機能または API 追加。
- **Major** (`x.0.0`): コンポーネントの公開 API またはスキーマに対する破壊的変更。

## 依存関係ルール

Cognis 内部コンポーネントの依存関係は `<=<tested-version>` の範囲を使用します。これにより、そのコンポーネントでテスト済みの最新依存バージョンを記録しつつ、より新しい未検証の依存関係がインストールされている場合に Administration のライフサイクル表示で警告できます。

## アダプター

| コンポーネント        | パス                                | バージョン |
| --------------------- | ----------------------------------- | ---------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.13`   |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.13`   |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.5`    |
| ファイル容量制限      | `src/adapters/file/quota/`          | `1.0.4`    |
| Local Auth            | `src/adapters/auth/local/`          | `0.3.5`    |
| Encrypted Keyring     | `src/adapters/auth/keyring/`        | `1.0.4`    |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.5`    |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.5`    |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.5`    |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.12`   |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.8`    |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.4.6`    |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.4.6`    |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.6`    |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.4`    |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.7`    |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.6`    |
| Public Registration   | `src/adapters/registration/public/` | `0.1.4`    |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.1.20`   |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.0.2`    |
| Link Share            | `src/adapters/share/link/`          | `1.1.5`    |
| User Share            | `src/adapters/share/user/`          | `1.1.9`    |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.7`    |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0`    |

## ゲートウェイ

| コンポーネント        | パス                         | バージョン |
| --------------------- | ---------------------------- | ---------- |
| Database (db)         | `src/gateways/db/`           | `1.2.2`    |
| Authentication (auth) | `src/gateways/auth/`         | `1.7.22`   |
| Share                 | `src/gateways/share/`        | `1.6.31`   |
| Two-Factor (tfa)      | `src/gateways/tfa/`          | `1.1.11`   |
| Notification (notify) | `src/gateways/notify/`       | `1.4.11`   |
| Social                | `src/gateways/social/`       | `1.2.7`    |
| File Storage (files)  | `src/gateways/files/`        | `2.1.2`    |
| Registration          | `src/gateways/registration/` | `1.1.10`   |
| Logging               | `src/gateways/logging/`      | `1.5.2`    |
| Study                 | `src/gateways/study/`        | `1.5.7`    |
| Calendar              | `src/gateways/calendar/`     | `1.4.27`   |

## コア契約

| コンポーネント | パス        | バージョン |
| -------------- | ----------- | ---------- |
| Core Package   | `src/core/` | `0.3.4`    |

## API

| コンポーネント | パス       | バージョン |
| -------------- | ---------- | ---------- |
| API Server     | `src/api/` | `0.1.16`   |

## モジュール

| コンポーネント       | パス                                | バージョン |
| -------------------- | ----------------------------------- | ---------- |
| Analytics            | `src/modules/analytics/`            | `2.0.4`    |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.3.17`   |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.2.15`   |
| Cognis Japanese      | `src/modules/study/languages/ja/`   | `1.2.6`    |
| Cognis English       | `src/modules/study/languages/en/`   | `1.2.4`    |
