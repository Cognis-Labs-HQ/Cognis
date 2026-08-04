# DevOps

## 概要

CognisはNode 22をベースにした単一のDockerイメージとして提供されます。CI/CDパイプラインは、すべてのプッシュまたはプルリクエストでの自動テストと、リリース時のコンテナレジストリへの自動イメージ配信をカバーします。

イメージは意図的に最小限: 本番依存関係のみをインストールし、非rootの `cognis` ユーザーとして実行し、単一のポートを公開します。

## 責務

- リポジトリソースから実行可能な非rootのNode 22 Dockerイメージをビルドする。
- すべてのプッシュとプルリクエストでインストール、型チェック、テストを実行する（CI）。
- リリース時にコンテナレジストリにイメージをビルドしてプッシュする（CD）。
- PostgreSQLとMariaDB向けにデータベース固有の本番および開発用Composeファイルを提供する。

## アーキテクチャ

### Dockerfile

`docker/Dockerfile` の Dockerfileは単一の `FROM node:22` ステージを使用します:

- 非rootの `cognis` システムユーザーとグループを作成。
- 正しい所有権を持つランタイムディレクトリを作成。
- `docker/cognisctl`、`docker/entrypoint.sh`、`docker/healthcheck.sh` をコピー。
- 非rootユーザーとして `npm ci --ignore-scripts` で依存関係をインストール。

```dockerfile
EXPOSE 3000
CMD ["node", "src/api/main.js"]
```

### 環境プロファイル

Dockerのデフォルト値はイメージ外の `docker/env/defaults.env` に保存されます。PostgreSQLとMariaDBには個別のドライバー、開発、本番用Envファイルがあり、対応する `docker-compose.<driver>.yaml` または `docker-compose.<driver>.dev.yaml` で選択します。デプロイ前に空のドライバー固有本番認証情報と暗号化キーを設定してください。 本番用Composeファイルでは、データベースパスワード、`DATABASE_URL`、`DATA_ENCRYPTION_KEY` に必須変数式を使用するため、すべての値を指定するまでComposeはコンテナを作成しません。

```sh
docker compose --env-file docker/env/production.env --env-file docker/env/postgres-production.env -f docker-compose.postgres.yaml up
docker compose --env-file docker/env/production.env --env-file docker/env/mariadb-production.env -f docker-compose.mariadb.yaml up
```

## 設定

| 変数                   | デフォルト   | 説明                                                    |
| ---------------------- | ------------ | ------------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | データベースバックエンド: `postgresql` または `mariadb` |
| `DATABASE_URL`         | —            | PostgreSQLまたはMariaDBの接続文字列                     |
| `LOG_LEVEL`            | `info`       | ランタイムログストリームの詳細度フィルター              |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | このサイズ（バイト）でアクティブログをローテーション    |
| `LOG_ROTATE_MAX_FILES` | `10`         | 保持するローテーション済みログアーカイブ数              |
| `LOG_ROTATE_COMPRESS`  | `true`       | ローテーション済みログを gzip（`.gz`）圧縮              |
| `PORT`                 | `3000`       | HTTPポート                                              |
| `COGNIS_SMTP_HOST`     | —            | SMTPサーバーのホスト名                                  |
