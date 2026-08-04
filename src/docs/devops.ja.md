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

Dockerのデフォルト値はイメージ外の `docker/env/default.env` に保存され、リポジトリルートの `.env` にリンクされます。PostgreSQLとMariaDBには個別のドライバー、開発、本番用Envファイルがあります。Composeは選択したエンジンのホスト、ポート、データベース、ユーザー名、パスワードを必須とし、それらから `DATABASE_URL` を構築します。本番プロファイルでは `DATA_ENCRYPTION_KEY` も必須のため、不完全な設定ではコンテナを作成できません。 本番用の秘密情報ファイルはGitの追跡対象外です。追跡されている `.example` テンプレートをコピーして、コピー先を編集してください。変数不足のエラーには、値を設定する正確なファイル名が表示されます。

```sh
cp docker/env/production.env.example docker/env/production.env
cp docker/env/postgres-production.env.example docker/env/postgres-production.env
cp docker/env/mariadb-production.env.example docker/env/mariadb-production.env
docker compose --env-file docker/env/default.env --env-file docker/env/postgres.env --env-file docker/env/production.env --env-file docker/env/postgres-production.env -f docker-compose.postgres.yaml up
docker compose --env-file docker/env/default.env --env-file docker/env/mariadb.env --env-file docker/env/production.env --env-file docker/env/mariadb-production.env -f docker-compose.mariadb.yaml up
docker compose --env-file docker/env/default.env --env-file docker/env/postgres.env --env-file docker/env/development.env --env-file docker/env/postgres-development.env -f docker-compose.postgres.dev.yaml up
docker compose --env-file docker/env/default.env --env-file docker/env/mariadb.env --env-file docker/env/development.env --env-file docker/env/mariadb-development.env -f docker-compose.mariadb.dev.yaml up
```

## 設定

| 変数                   | デフォルト   | 説明                                                    |
| ---------------------- | ------------ | ------------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | データベースバックエンド: `postgresql` または `mariadb` |
| `DATABASE_URL`         | —            | 選択したエンジン設定からComposeが構築                   |
| `LOG_LEVEL`            | `info`       | ランタイムログストリームの詳細度フィルター              |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | このサイズ（バイト）でアクティブログをローテーション    |
| `LOG_ROTATE_MAX_FILES` | `10`         | 保持するローテーション済みログアーカイブ数              |
| `LOG_ROTATE_COMPRESS`  | `true`       | ローテーション済みログを gzip（`.gz`）圧縮              |
| `PORT`                 | `3000`       | HTTPポート                                              |
| `COGNIS_SMTP_HOST`     | —            | SMTPサーバーのホスト名                                  |

有効なDockerデフォルト値とセットアップ上書き値は、`docker/env/` 配下のEnvファイルに直接記載されています。
