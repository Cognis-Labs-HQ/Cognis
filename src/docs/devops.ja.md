# DevOps

## 概要

CognisはNode 22をベースにした単一のDockerイメージとして提供されます。CI/CDパイプラインは、すべてのプッシュまたはプルリクエストでの自動テストと、リリース時のコンテナレジストリへの自動イメージ配信をカバーします。

イメージは意図的に最小限: 本番依存関係のみをインストールし、非rootの `cognis` ユーザーとして実行し、単一のポートを公開します。

## 責務

- リポジトリソースから実行可能な非rootのNode 22 Dockerイメージをビルドする。
- すべてのプッシュとプルリクエストでインストール、型チェック、テストを実行する（CI）。
- リリース時にコンテナレジストリにイメージをビルドしてプッシュする（CD）。
- PostgreSQLデータベースでのローカル開発用に `docker-compose.yaml` を提供する。

## アーキテクチャ

### Dockerfile

`docker/Dockerfile` の Dockerfileは単一の `FROM node:22` ステージを使用します:

- 非rootの `cognis` システムユーザーとグループを作成。
- 正しい所有権を持つランタイムディレクトリを作成。
- `docker/cognisctl`、`docker/entrypoint.sh`、`docker/healthcheck.sh` をコピー。
- 非rootユーザーとして `npm ci --ignore-scripts` で依存関係をインストール。

```dockerfile
EXPOSE 3000
ENV NODE_ENV=production
ENV DB_TYPE=sqlite
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
```

## 設定

| 変数 | デフォルト | 説明 |
| ---- | ---------- | ---- |
| `DB_TYPE` | `sqlite` | データベースバックエンド |
| `DATABASE_URL` | — | PostgreSQLまたはMariaDBの接続文字列 |
| `LOG_LEVEL` | `info` | ログの詳細度 |
| `PORT` | `3000` | HTTPポート |
| `COGNIS_SMTP_HOST` | — | SMTPサーバーのホスト名 |
