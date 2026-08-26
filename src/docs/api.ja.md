# API

## 概要

`src/api/` は Cognis の HTTP 層です。Express 互換の Node.js サーバー、ルートレジストリ、認証ミドルウェア、および受信 HTTP リクエストをゲートウェイ操作にマッピングするすべての薄いルートハンドラーモジュールをホストしています。API 層は意図的に薄く保たれています。ルートハンドラーは入力を解析・検証し、ゲートウェイに委譲して、安定したレスポンスエンベロープを返します。ルートハンドラーはデータベースドライバーや外部サービス SDK への直接参照を保持しません。

サーバーはハードコードされたコンポーネントリストからではなく、起動時に存在するものから組み立てられます。ゲートウェイはブートストラップ時に `ctx.routeRegistry.register(...)` を介して自身のルートを登録します。サーバーはレジストリを反復してルートテーブルを構築します。ゲートウェイを削除するとそのルートが自動的に削除されます。

認証はログイン時に発行される不透明なベアラートークンを使用します。同じトークンは、サーバーレンダリングされたページガード用の HttpOnly Cookie (`cognis_access_token`) としても設定されます。有効期限のない CLI ブートストラップトークンが、信頼されたローカルツール用に起動時にディスクに書き込まれます。

## 責務

- HTTP サーバーをホストし、ルートレジストリをリクエスト処理に組み込む。
- すべての保護されたルートハンドラーが使用する `requireAuth` および `getAuthClaims` ミドルウェアを提供する。
- `{ data }` / `{ error }` レスポンスエンベロープ規約を適用する。
- `src/api/bootstrap/gateway.ts` を介してすべてのゲートウェイを依存順にブートストラップする。
- `src/api/bootstrap/db-init.ts` を介して起動時にデータベーススキーマを初期化する。
- ルートハンドラー用の再利用ユーティリティを提供する: `src/api/reuse/`。

責務外: ドメインロジックの実装、データの直接保存、またはどのゲートウェイがインストールされているかの把握。

## アーキテクチャ

### レスポンスエンベロープ

すべての API レスポンスは以下の 2 つの形式のいずれかを使用します:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Requires admin scope" } }
```

内部エラーの詳細はクライアントに送信されません。サーバー側のログが完全なエラーコンテキストをキャプチャします。

### 認証モデル

`POST /api/v1/auth/login` でトークンを取得します。レスポンスには `data.token` が含まれます。以降のリクエストでは `Authorization: Bearer <token>` としてトークンを送信します。ログインエンドポイントは、サーバーレンダリングされたルートガード用の HttpOnly Cookie として `cognis_access_token` も設定します。

トークンの有効期限は `COGNIS_ACCESS_TOKEN_TTL_SECONDS` で制御されます (デフォルト: `43200`、12 時間)。起動時、サーバーは信頼されたローカル CLI 使用のために有効期限のない CLI ブートストラップトークンを `COGNIS_CLI_TOKEN_PATH` (デフォルト `/app/config/cli-access.token`、モード `0600`) に書き込みます。

### デフォルトの永続化設定

| `DB_TYPE`                 | バックエンド | 接続                  |
| ------------------------- | ------------ | --------------------- |
| `postgresql` (デフォルト) | PostgreSQL   | `DATABASE_URL` が必要 |
| `mariadb`                 | MariaDB      | `DATABASE_URL` が必要 |

### 主要なソースの場所

| パス                                 | 目的                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| `src/api/main.ts`                    | サーバーエントリポイント                                 |
| `src/api/server.ts`                  | HTTP サーバーのセットアップとルートディスパッチ          |
| `src/api/reuse/route-registry.ts`    | ゲートウェイが自己登録に使用するルートレジストリ         |
| `src/api/bootstrap/gateway.ts`       | ゲートウェイブートストラップ文脈とブートストラップ契約   |
| `src/gateways/auth/guard.ts`         | `requireAuth`、`getAuthClaims` ミドルウェア              |
| `src/gateways/auth/access-tokens.ts` | トークンの発行と検証                                     |
| `src/api/bootstrap/db-init.ts`       | 起動時のスキーマ初期化                                   |
| `src/api/reuse/`                     | 共有ユーティリティ (暗号、JSON 読み取り、ストアヘルパー) |

## 設定

| 変数                              | デフォルト                     | 説明                                                    |
| --------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                   | データベースバックエンド: `postgresql` または `mariadb` |
| `DATABASE_URL`                    | —                              | PostgreSQL または MariaDB の接続文字列                  |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | ベアラートークンの有効期限 (秒)                         |
| `COGNIS_CLI_TOKEN_PATH`           | `/app/config/cli-access.token` | CLI ブートストラップトークンのパス                      |
| `COGNIS_MODULE_SOURCES_PATH`      | `config/module-sources.json`   | モジュールマーケットプレイスのソース設定を永続化するパス |
| `COGNIS_GATEWAYS_ROOT`            | `src/gateways`                 | ゲートウェイ検出のルートディレクトリ                    |
| `COGNIS_ADAPTERS_ROOT`            | `src/adapters`                 | アダプター検出のルートディレクトリ                      |
| `PORT`                            | `3000`                         | HTTP ポート                                             |
| `LISTEN_HOST`                     | `0.0.0.0`                      | バインドアドレス                                        |

## API ルート

### システム

| メソッド | パス                         | 説明                                 | 認証 |
| -------- | ---------------------------- | ------------------------------------ | ---- |
| `GET`    | `/api/v1/system/health`      | 稼働時間付きの完全なヘルスステータス | なし |
| `GET`    | `/api/v1/system/healthcheck` | 最小限の生存確認プローブ             | なし |
| `GET`    | `/api/v1/system/ui-config`   | UI 設定オブジェクト                  | なし |

### 認証

| メソッド | パス                         | 説明                            | 認証 |
| -------- | ---------------------------- | ------------------------------- | ---- |
| `GET`    | `/api/v1/auth/login-methods` | 有効な認証プロバイダーの一覧    | なし |
| `POST`   | `/api/v1/auth/register`      | セルフ登録; `user` ロールを発行 | なし |
| `POST`   | `/api/v1/auth/login`         | 認証; ベアラートークンを返す    | なし |

### モジュール

| メソッド | パス                          | 説明                         | 認証   |
| -------- | ----------------------------- | ---------------------------- | ------ |
| `GET`    | `/api/v1/modules`             | すべてのモジュールを一覧表示 | Bearer |
| `POST`   | `/api/v1/modules/:id/enable`  | モジュールを有効化           | Admin  |
| `POST`   | `/api/v1/modules/:id/disable` | モジュールを無効化           | Admin  |

### ゲートウェイ

| メソッド | パス                           | 説明                                 | 認証  |
| -------- | ------------------------------ | ------------------------------------ | ----- |
| `GET`    | `/api/v1/gateways`             | 登録済みゲートウェイをすべて一覧表示 | Admin |
| `GET`    | `/api/v1/gateways/:id`         | 単一ゲートウェイのマニフェスト       | Admin |
| `POST`   | `/api/v1/gateways/:id/enable`  | ゲートウェイをアクティブとしてマーク | Admin |
| `POST`   | `/api/v1/gateways/:id/disable` | ゲートウェイを無効としてマーク       | Admin |
| `GET`    | `/api/v1/admin/sections`       | ゲートウェイからの管理 UI セクション | Admin |

### UI 拡張

| メソッド | パス                                 | 説明                             | 認証   |
| -------- | ------------------------------------ | -------------------------------- | ------ |
| `GET`    | `/api/v1/ui/page-extensions/:pageId` | ゲートウェイが提供するページ要素 | Bearer |

### ドキュメント

| メソッド | パス                           | 説明                                             | 認証 |
| -------- | ------------------------------ | ------------------------------------------------ | ---- |
| `GET`    | `/api/v1/docs`                 | 利用可能なすべてのドキュメントスラッグを一覧表示 | なし |
| `GET`    | `/api/v1/docs/:slugOrTreePath` | スラッグで単一のドキュメントを取得               | なし |

### プロファイル

| メソッド | パス                                   | 説明                               | 認証   |
| -------- | -------------------------------------- | ---------------------------------- | ------ |
| `GET`    | `/api/v1/social/profile/ping`          | 機能確認                           | Bearer |
| `GET`    | `/api/v1/social/profile`               | 自分のプロファイル                 | Bearer |
| `PATCH`  | `/api/v1/social/profile`               | 自分のプロファイルフィールドを更新 | Bearer |
| `PUT`    | `/api/v1/social/profile/avatar`        | アバターをアップロード             | Bearer |
| `DELETE` | `/api/v1/social/profile/avatar`        | 自分のアバターを削除               | Bearer |
| `PUT`    | `/api/v1/social/profile/banner`        | バナーをアップロード               | Bearer |
| `DELETE` | `/api/v1/social/profile/banner`        | 自分のバナーを削除                 | Bearer |
| `GET`    | `/api/v1/social/users/:handle/profile` | 公開プロファイル (可視性でゲート)  | Bearer |

### ソーシャルグラフ

| メソッド | パス                                     | 説明                              | 認証   |
| -------- | ---------------------------------------- | --------------------------------- | ------ |
| `POST`   | `/api/v1/social/users/:handle/follow`    | ユーザーをフォロー                | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/follow`    | フォロー解除                      | Bearer |
| `POST`   | `/api/v1/social/users/:handle/block`     | ユーザーをブロック                | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/block`     | ブロック解除                      | Bearer |
| `GET`    | `/api/v1/social/users/:handle/followers` | フォロワーリスト (可視性でゲート) | Bearer |
| `GET`    | `/api/v1/social/users/:handle/following` | フォローリスト (可視性でゲート)   | Bearer |

### 投稿

| メソッド | パス                                 | 説明                                            | 認証   |
| -------- | ------------------------------------ | ----------------------------------------------- | ------ |
| `POST`   | `/api/v1/social/posts`               | 投稿を作成                                      | Bearer |
| `GET`    | `/api/v1/social/posts`               | 自分の投稿を一覧表示                            | Bearer |
| `DELETE` | `/api/v1/social/posts/:id`           | 投稿を削除 (所有者、モデレーター、または管理者) | Bearer |
| `GET`    | `/api/v1/social/users/:handle/posts` | ユーザーの投稿を一覧表示                        | Bearer |

### ファイル

| メソッド | パス                                         | 説明                           | 認証   |
| -------- | -------------------------------------------- | ------------------------------ | ------ |
| `PUT`    | `/api/v1/files/:bucket/:key`                 | ファイルをアップロード         | Bearer |
| `GET`    | `/api/v1/files/:bucket/:key`                 | ファイルをダウンロード         | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key`                 | ファイルを削除                 | Admin  |
| `GET`    | `/api/v1/social/admin/file-limits`           | カテゴリ別サイズ制限を一覧表示 | Admin  |
| `PUT`    | `/api/v1/social/admin/file-limits/:category` | サイズ制限を設定               | Admin  |

### ユーザー (管理者)

| メソッド | パス                              | 説明                   | 認証  |
| -------- | --------------------------------- | ---------------------- | ----- |
| `GET`    | `/api/v1/users`                   | アカウントを一覧表示   | Admin |
| `POST`   | `/api/v1/users/:username/role`    | アカウントロールを設定 | Admin |
| `POST`   | `/api/v1/users/:username/disable` | アカウントを無効化     | Admin |
| `POST`   | `/api/v1/users/:username/enable`  | アカウントを有効化     | Admin |
| `DELETE` | `/api/v1/users/:username`         | アカウントを削除       | Admin |
