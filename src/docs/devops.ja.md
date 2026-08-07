# DevOps

## 概要

CognisはNode 22のアプリケーションイメージと `cognis-web` Nginxエッジイメージとして提供されます。CI/CDパイプラインは、すべてのプッシュまたはプルリクエストでの自動テストと、リリース時のコンテナレジストリへの自動イメージ配信をカバーします。

アプリケーションイメージは意図的に最小限です。本番依存関係のみをインストールし、非rootの `cognis` ユーザーとして実行し、単一の内部ポートを公開します。本番Composeはその前段に `cognis-web` のエッジイメージを置き、GitLab CIは同じエッジ成果物を `$CI_REGISTRY_IMAGE/cognis-web:<ref>` と `:sha-<commit>` として公開します。

## 責務

- リポジトリソースから実行可能な非rootのNode 22アプリケーションイメージをビルドする。
- 公開TLSトラフィック向けに `docker/cognis-web` から `cognis-web` エッジイメージをビルドする。
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

### コンテナの既定値

実行可能な既定値はアプリケーションと Web の各イメージに組み込まれています。`docker compose up --build` は生成済み環境ファイルなしで PostgreSQL スタックを起動します。MariaDB には `docker compose -f docker-compose.mariadb.yaml up --build` を使用します。デプロイは通常の環境設定でイメージの既定値を上書きできます。アプリケーションのエントリポイントは設定されたコマンドを実行するだけです。

Web イメージは既定で HTTP を待ち受けます。設定された両方の証明書パスが存在して読み取り可能な場合は、HTTPS と HTTP から HTTPS へのリダイレクトも有効になります。TLS モード変数は不要です。

```sh
docker compose up --build
```

## 設定

| 変数                             | デフォルト                     | 説明                                                              |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `DB_TYPE`                        | `postgresql`                   | データベースバックエンド: `postgresql` または `mariadb`           |
| `DATABASE_URL`                   | —                              | データベース接続 URL。選択したプロバイダーに合わせて上書き        |
| `LOG_LEVEL`                      | `info`                         | ランタイムログストリームの詳細度フィルター                        |
| `LOG_ROTATE_MAX_BYTES`           | `10485760`                     | このサイズ（バイト）でアクティブログをローテーション              |
| `LOG_ROTATE_MAX_FILES`           | `10`                           | 保持するローテーション済みログアーカイブ数                        |
| `LOG_ROTATE_COMPRESS`            | `true`                         | ローテーション済みログを gzip（`.gz`）圧縮                        |
| `PORT`                           | `3000`                         | HTTPポート                                                        |
| `COGNIS_WEB_TLS_CERTIFICATE`     | `/etc/nginx/tls/fullchain.pem` | 証明書パス。証明書と鍵の両方が読み取り可能な場合に HTTPS を有効化 |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY` | `/etc/nginx/tls/privkey.pem`   | 秘密鍵パス。証明書と鍵の両方が読み取り可能な場合に HTTPS を有効化 |
| `HOST`                           | —                              | 必須の内部サービスホスト名                                        |
| `EXTERNAL_HOST`                  | —                              | 必須の公開アクセスURL                                             |
| `CONTACT_EMAIL`                  | —                              | 必須の公開連絡先                                                  |
| `COGNIS_SMTP_HOST`               | —                              | SMTPサーバーのホスト名                                            |

アプリケーションの既定値は `docker/Dockerfile` に、Web の既定値は `docker/cognis-web/Dockerfile` に定義されています。
