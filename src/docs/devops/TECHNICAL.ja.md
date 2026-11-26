# 技術リファレンス

コンテナー構成は、永続的なデータベース、メディア、設定ストレージを使い、コンパイル済み Node サーバーを nginx の背後で実行します。

## インターフェース

Compose がアプリ、nginx、選択したデータベースを起動します。docker/entrypoint.sh が不足時の DATABASE_URL を作り、docker/healthcheck.sh が動作を確認します。

## 設定

### 設定

| 変数                                     | デフォルト   | 説明                                                    |
| ---------------------------------------- | ------------ | ------------------------------------------------------- |
| `DB_TYPE`                                | `postgresql` | データベースバックエンド: `postgresql` または `mariadb` |
| `DATABASE_URL`                           | —            | プロバイダー項目の代わりに指定する完全な接続 URL        |
| `POSTGRES_HOST` / `MARIADB_HOST`         | —            | データベースサービスのホスト名                          |
| `POSTGRES_PORT` / `MARIADB_PORT`         | —            | データベースサービスのポート                            |
| `POSTGRES_DB` / `MARIADB_DATABASE`       | —            | データベース名                                          |
| `POSTGRES_USER` / `MARIADB_USER`         | —            | データベースアカウント                                  |
| `POSTGRES_PASSWORD` / `MARIADB_PASSWORD` | —            | データベースアカウントのパスワード                      |
| `LOG_LEVEL`                              | `info`       | ランタイムログストリームの詳細度フィルター              |
| `LOG_ROTATE_MAX_BYTES`                   | `10485760`   | このサイズ（バイト）でアクティブログをローテーション    |
| `LOG_ROTATE_MAX_FILES`                   | `10`         | 保持するローテーション済みログアーカイブ数              |
| `LOG_ROTATE_COMPRESS`                    | `true`       | ローテーション済みログを gzip（`.gz`）圧縮              |
| `PORT`                                   | `3000`       | HTTPポート                                              |
| `HOST`                                   | —            | 必須の内部サービスホスト名                              |
| `EXTERNAL_HOST`                          | —            | 必須の公開アクセスURL                                   |
| `CONTACT_EMAIL`                          | —            | 必須の公開連絡先                                        |
| `COGNIS_SMTP_HOST`                       | —            | SMTPサーバーのホスト名                                  |

アプリケーションの既定値は `docker/Dockerfile` に、nginx プロキシの動作は `docker/cognis-web/default.conf.template` に定義されています。

## 動作

### 概要

Cognis は Node 24 アプリケーションイメージを提供し、未変更の `nginx:stable-alpine` イメージと組み合わせます。CI/CDパイプラインは、すべてのプッシュまたはプルリクエストでの自動テストと、リリース時のコンテナレジストリへの自動イメージ配信をカバーします。

アプリケーションイメージは意図的に最小限です。本番依存関係のみをインストールし、非rootの `cognis` ユーザーとして実行し、単一の内部ポートを公開します。Compose は標準の設定テンプレートをマウントした汎用 nginx を前段に配置します。

### 責務

- リポジトリソースから実行可能な非rootのNode 24アプリケーションイメージをビルドする。
- すべてのプッシュとプルリクエストでインストール、型チェック、テストを実行する（CI）。
- リリース時にアプリケーションイメージをコンテナレジストリにビルドしてプッシュする（CD）。
- PostgreSQLとMariaDB向けにデータベース固有の本番および開発用Composeファイルを提供する。

### Dockerfile

`docker/Dockerfile` の Dockerfileは単一の `FROM node:24` ステージを使用します:

- 非rootの `cognis` システムユーザーとグループを作成。
- 正しい所有権を持つランタイムディレクトリを作成。
- `docker/cognisctl`、`docker/entrypoint.sh`、`docker/healthcheck.sh` をコピー。
- 非 root ユーザーとしてソースをコピーし、ビルド依存関係を導入して両方のビルドを検証した後、開発専用パッケージを削除。

```dockerfile
EXPOSE 3000
CMD ["node", "src/api/main.js"]
```

### コンテナの既定値

実行可能な既定値はアプリケーションイメージに残し、データベース認証情報と `DATA_ENCRYPTION_KEY` はデプロイ環境から提供します。各 Compose プロファイルは対応する PostgreSQL または MariaDB の接続項目をアプリケーションコンテナへ渡し、エントリポイントが `DATABASE_URL` を生成します。その他のデプロイでは、同じプロバイダー固有項目または完全な `DATABASE_URL` のいずれかを指定できます。

Web プロファイルは未変更の `nginx:stable-alpine` イメージを使用し、`docker/cognis-web/default.conf.template` を nginx 標準のテンプレートディレクトリにマウントします。専用の Web イメージやエントリポイントなしで HTTP キャッシュとプロキシヘッダーを提供します。nginx で TLS を終端するデプロイは独自の標準 nginx TLS 設定をマウントでき、Kubernetes Ingress や外部プロキシも Cognis イメージを変更せずに TLS を終端できます。

Compose は必須の秘密情報をプロセス環境から読み取り、値が不足している場合は明確なエラーで停止します。PostgreSQL プロファイルを起動する前に、デプロイ環境で管理された値を設定してください。

```sh
export POSTGRES_PASSWORD='<データベースパスワード>'
export DATA_ENCRYPTION_KEY='<64 文字の暗号化キー>'
docker compose up --build
```

MariaDB の場合は、代わりに `MARIADB_PASSWORD` を設定し、`docker-compose.mariadb.yaml` を起動します。コンテナがランダムな root パスワードを生成してログに記録するため、`MARIADB_ROOT_PASSWORD` は不要であり、読み込まれません。Kubernetes などのオーケストレーターは標準の秘密情報管理機能を通じて値を注入するため、リポジトリのセットアップスクリプトは不要です。

## セキュリティ

イメージの非 root ユーザーで実行します。接続情報と DATA_ENCRYPTION_KEY は配置環境の秘密管理に置き、鍵を維持して信頼できるプロキシで TLS を終端します。

## リファレンス

- [docker/Dockerfile](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/docker/Dockerfile)
- [docker/entrypoint.sh](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/docker/entrypoint.sh)
- [docker/healthcheck.sh](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/docker/healthcheck.sh)
