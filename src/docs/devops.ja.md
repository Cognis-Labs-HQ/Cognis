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

### 環境プロファイル

Dockerのデフォルト値は `docker/env/default.env` に保持されます。`./setup.sh` はアプリケーションとデータベースの値を `docker/env/runtime.env` に、エッジTLS設定だけを `docker/env/cognis-web.env` に書き込みます。Composeは `cognis-web` にWebファイルのみを渡すため、Cognisの暗号化キーやデータベース認証情報を読み取れません。セットアップは、別のリバースプロキシまたはCDNがHTTPSを終端するか確認し、はいなら `deferred`、いいえなら `terminate` を書き込みます。

envファイルはCompose向けの便宜的な手段であり、実行時の必須要件ではありません。Kubernetesなどのオーケストレーターは、同じ値をコンテナへ直接注入できます。`DB_TYPE` とプロバイダー固有の接続変数を指定する方法と、`DATABASE_URL` を直接指定する方法のどちらも利用できます。`DB_TYPE` を省略すると、エントリポイントはPostgreSQLまたはMySQL/MariaDBのURLスキームから種類を判定します。

TraefikなどのリバースプロキシでTLSを終端する場合は、
`COGNIS_WEB_TLS_MODE=deferred`を使用し、`cognis-web`のHTTPポート80へ
アップストリーム接続してください。コンテナの自動サービス検出でプロキシが
誤ってポート443のTLSリスナーを選択し、HTTP 421を返すことがないよう、
イメージが公開するポートは80だけです。`cognis-web`自身でTLSを終端する場合、
ポート443はComposeの明示的な公開設定を通して引き続き利用できます。

```sh
./setup.sh
docker compose up --build
```

## 設定

| 変数                             | デフォルト                     | 説明                                                                                             |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `DB_TYPE`                        | `postgresql`                   | データベースバックエンド: `postgresql` または `mariadb`                                          |
| `DATABASE_URL`                   | —                              | 選択したエンジン設定からコンテナのエントリポイントが構築                                         |
| `LOG_LEVEL`                      | `info`                         | ランタイムログストリームの詳細度フィルター                                                       |
| `LOG_ROTATE_MAX_BYTES`           | `10485760`                     | このサイズ（バイト）でアクティブログをローテーション                                             |
| `LOG_ROTATE_MAX_FILES`           | `10`                           | 保持するローテーション済みログアーカイブ数                                                       |
| `LOG_ROTATE_COMPRESS`            | `true`                         | ローテーション済みログを gzip（`.gz`）圧縮                                                       |
| `PORT`                           | `3000`                         | HTTPポート                                                                                       |
| `COGNIS_WEB_TLS_MODE`            | `terminate`                    | エッジTLSモード: ローカルHTTPSは `terminate`、信頼済みTLS終端の背後でHTTPのみの場合は `deferred` |
| `COGNIS_WEB_TLS_CERTIFICATE`     | `/etc/nginx/tls/fullchain.pem` | `cognis-web` 内の証明書パス。`terminate` モードでのみ読み込みます                                |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY` | `/etc/nginx/tls/privkey.pem`   | 秘密鍵パス。`terminate` モードでのみ読み込みます                                                 |
| `HOST`                           | —                              | 必須の内部サービスホスト名                                                                       |
| `EXTERNAL_HOST`                  | —                              | 必須の公開アクセスURL                                                                            |
| `CONTACT_EMAIL`                  | —                              | 必須の公開連絡先                                                                                 |
| `COGNIS_SMTP_HOST`               | —                              | SMTPサーバーのホスト名                                                                           |

有効なDockerデフォルト値とセットアップ上書き値は、`docker/env/` 配下のEnvファイルに直接記載されています。
