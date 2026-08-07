# DevOps

## 概要

Cognis は Node 22 アプリケーションイメージを提供し、未変更の `nginx:stable-alpine` イメージと組み合わせます。CI/CDパイプラインは、すべてのプッシュまたはプルリクエストでの自動テストと、リリース時のコンテナレジストリへの自動イメージ配信をカバーします。

アプリケーションイメージは意図的に最小限です。本番依存関係のみをインストールし、非rootの `cognis` ユーザーとして実行し、単一の内部ポートを公開します。Compose は標準の設定テンプレートをマウントした汎用 nginx を前段に配置します。

## 責務

- リポジトリソースから実行可能な非rootのNode 22アプリケーションイメージをビルドする。
- すべてのプッシュとプルリクエストでインストール、型チェック、テストを実行する（CI）。
- リリース時にアプリケーションイメージをコンテナレジストリにビルドしてプッシュする（CD）。
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

実行可能な既定値はアプリケーションイメージに残し、`DATABASE_URL` や `DATA_ENCRYPTION_KEY` などの機密値はデプロイ環境から提供します。アプリケーションのエントリポイントはデータベース設定エラーを記録し、Cognis の実行前にプロバイダー固有の項目から `DATABASE_URL` を生成できます。Compose は標準の環境変数展開で機密値を渡します。

Web プロファイルは未変更の `nginx:stable-alpine` イメージを使用し、`docker/cognis-web/default.conf.template` を nginx 標準のテンプレートディレクトリにマウントします。専用の Web イメージやエントリポイントなしで HTTP キャッシュとプロキシヘッダーを提供します。nginx で TLS を終端するデプロイは独自の標準 nginx TLS 設定をマウントでき、Kubernetes Ingress や外部プロキシも Cognis イメージを変更せずに TLS を終端できます。

```sh
docker compose up --build
```

## 設定

| 変数                   | デフォルト   | 説明                                                       |
| ---------------------- | ------------ | ---------------------------------------------------------- |
| `DB_TYPE`              | `postgresql` | データベースバックエンド: `postgresql` または `mariadb`    |
| `DATABASE_URL`         | —            | データベース接続 URL。選択したプロバイダーに合わせて上書き |
| `LOG_LEVEL`            | `info`       | ランタイムログストリームの詳細度フィルター                 |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | このサイズ（バイト）でアクティブログをローテーション       |
| `LOG_ROTATE_MAX_FILES` | `10`         | 保持するローテーション済みログアーカイブ数                 |
| `LOG_ROTATE_COMPRESS`  | `true`       | ローテーション済みログを gzip（`.gz`）圧縮                 |
| `PORT`                 | `3000`       | HTTPポート                                                 |
| `HOST`                 | —            | 必須の内部サービスホスト名                                 |
| `EXTERNAL_HOST`        | —            | 必須の公開アクセスURL                                      |
| `CONTACT_EMAIL`        | —            | 必須の公開連絡先                                           |
| `COGNIS_SMTP_HOST`     | —            | SMTPサーバーのホスト名                                     |

アプリケーションの既定値は `docker/Dockerfile` に、nginx プロキシの動作は `docker/cognis-web/default.conf.template` に定義されています。
