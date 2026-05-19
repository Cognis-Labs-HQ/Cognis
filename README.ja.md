# Cognis

Cognis は、軽量なソーシャルネットワーク機能を備えた、API ファーストでモジュール型の語学学習プラットフォームです。

## 現在の構成

- `core/`: 契約、ゲートウェイインターフェース、コアサービス。
- `api/`: ドメイン意図とドキュメントエンドポイントを表す `/api/v1` ルートの骨組み。
- `adapters/`: バックエンド固有のゲートウェイ実装。
- `ui/`: 学習、ドキュメント、管理、ユーザー設定向けフロントエンドアプリ。
- `modules/`: コンパイル時モジュールのルート。
- `tooling/cli/`: `cognisctl` プレースホルダーユーティリティ。
- `docs/components/`: UI から API 経由で利用できる集中管理コンポーネントドキュメント。

## 設計原則

API ハンドラーは**何を**するかを定義し、ゲートウェイ/アダプターはバックエンド固有の振る舞いを**どのように**実行するかを決定します。

## CI/CD

- GitHub Actions:
    - push/pull request 時に CI テストを実行。
    - リリース公開時または手動実行で `ghcr.io/<owner>/cognis` へ Docker build+push。
- GitLab CI:
    - ブランチおよびタグコミット時にテストを実行。
    - タグ時または手動実行で `registry.gitlab.firehawk-systems.com/firehawk/cognis` へ Docker build+push。

## コンテナオーケストレーション

- `docker-compose.yml`: 本番相当プロファイル（`NODE_ENV=production`, `COGNIS_UI_DEMO_MODE=0`）。
- `docker-compose.dev.yaml`: 開発/デモ用プロファイル（`NODE_ENV=development`, `COGNIS_UI_DEMO_MODE=1`）。進行中の UI/API 編集のためにバインドマウントを有効化。

## AI ガイダンス

- AI 固有のコントリビュート指針は `AI_GUIDELINES.md` に分離されています（製品/ユーザードキュメントとは別）。

## CLI

- 運用コントロールのエントリーポイントとして `tooling/cli/src/index.ts`（`cognisctl`）を使用します。
- API ターゲットは `COGNIS_API_URL`（デフォルト `http://localhost:3000`）で設定します。
- ユーザーライフサイクル操作は `user:*` 名前空間（`user:preferences:clear` を含む）で管理します。
- モジュールは `modules/<moduleId>/cli/index.js` 経由でサブコマンドを提供できます。
- Docker イメージのシェル内では `cognisctl` を PATH から直接利用できます。
