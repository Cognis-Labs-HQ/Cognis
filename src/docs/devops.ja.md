# DevOps

## 概要

CognisはNode 22のアプリケーションイメージと `cognis-web` Nginxエッジイメージとして提供されます。CI/CDパイプラインは、すべてのプッシュまたはプルリクエストでの自動テストと、リリース時のコンテナレジストリへの自動イメージ配信をカバーします。

アプリケーションイメージは意図的に最小限です。本番依存関係のみをインストールし、非rootの `cognis` ユーザーとして実行し、単一の内部ポートを公開します。本番Composeはその前段に `cognis-web` のエッジイメージを置き、GitLab CIは同じエッジ成果物を `$CI_REGISTRY_IMAGE/cognis-web:<ref>` と `:sha-<commit>` として公開します。

## 責務

- リポジトリソースから実行可能な非rootのNode 22アプリケーションイメージをビルドする。
- 公開TLSトラフィック向けに `docker/edge` から `cognis-web` エッジイメージをビルドする。
- すべてのプッシュとプルリクエストでインストール、型チェック、テストを実行する（CI）。
- リリース時にアプリケーションイメージと `cognis-web` イメージをコンテナレジストリにビルドしてプッシュする（CD）。
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

Dockerのデフォルト値は、追跡対象の `docker/env/default.env` に保持されます。`./setup.sh` を実行してPostgreSQLまたはMariaDB、開発または本番を選び、接続設定を入力します。スクリプトはユーザー固有の値をGitで無視される単一の `docker/env/runtime.env` に書き込み、空欄の秘密情報を生成し、選択したドライバーを使うよう `docker-compose.yaml` を更新します。Composeは両方のEnvファイルを明示的なリポジトリ相対パスで読み込みます。コンテナのエントリポイントは生成された設定を検証し、`DATABASE_URL` を構築します。 セットアップでは内部 `HOST`、公開 `EXTERNAL_HOST`、公開 `CONTACT_EMAIL` も必須です。コンテナは3項目すべてを検証し、アプリケーションも公開ホストまたは連絡先がない場合は独立して起動を拒否します。セットアップは、別のリバースプロキシまたはCDNが `cognis-web` の前でHTTPSを終端するか確認します。はいの場合は `COGNIS_EDGE_TLS_MODE=deferred`、いいえの場合はローカルTLS終端の `terminate` を書き込みます。

```sh
./setup.sh
docker compose up --build
```

## 設定

| 変数                   | デフォルト   | 説明                                                                                             |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `DB_TYPE`              | `postgresql` | データベースバックエンド: `postgresql` または `mariadb`                                          |
| `DATABASE_URL`         | —            | 選択したエンジン設定からコンテナのエントリポイントが構築                                         |
| `LOG_LEVEL`            | `info`       | ランタイムログストリームの詳細度フィルター                                                       |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | このサイズ（バイト）でアクティブログをローテーション                                             |
| `LOG_ROTATE_MAX_FILES` | `10`         | 保持するローテーション済みログアーカイブ数                                                       |
| `LOG_ROTATE_COMPRESS`  | `true`       | ローテーション済みログを gzip（`.gz`）圧縮                                                       |
| `PORT`                 | `3000`       | HTTPポート                                                                                       |
| `COGNIS_EDGE_TLS_MODE` | `terminate`  | エッジTLSモード: ローカルHTTPSは `terminate`、信頼済みTLS終端の背後でHTTPのみの場合は `deferred` |
| `HOST`                 | —            | 必須の内部サービスホスト名                                                                       |
| `EXTERNAL_HOST`        | —            | 必須の公開アクセスURL                                                                            |
| `CONTACT_EMAIL`        | —            | 必須の公開連絡先                                                                                 |
| `COGNIS_SMTP_HOST`     | —            | SMTPサーバーのホスト名                                                                           |

有効なDockerデフォルト値とセットアップ上書き値は、`docker/env/` 配下のEnvファイルに直接記載されています。
