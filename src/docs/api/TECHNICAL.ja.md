# 技術リファレンス

HTTP ホストは登録ルートに要求を振り分け、コンポーネント検出とバージョン付き文書を配信します。

## インターフェース

`GET /api/v1/system/healthcheck` は軽量な生存確認です。`GET /api/v1/system/health` はコンポーネントの状態を含みます。`GET /api/v1/ui/capability-providers` はセッションとアクセス規則で提供者を絞り、匿名呼び出しには明示的に公開されたロール制限のない提供者だけを返します。

文書のメソッド、応答項目、言語選択は[サーバーのリファレンス](/docs/components/api/technical)を参照してください。ドメインのエンドポイントは [Auth](/docs/gateways/auth/technical)、[Calendar](/docs/gateways/calendar/technical)、[Share](/docs/gateways/share/technical)などが所有します。

## 設定

ソース実行時は `PORT`（既定 `3000`）と `LISTEN_HOST`（既定 `0.0.0.0`）を読みます。`COGNIS_GATEWAYS_ROOT` と `COGNIS_ADAPTERS_ROOT` は検出先を変更します。コンテナーと接続の設定は [DevOps](/docs/devops/technical)、ドライバーの設定は [DB](/docs/gateways/db/technical)が説明します。

## 動作

起動処理はゲートウェイのルートと UI 情報を読み込みます。ホストは HTTP 要求を振り分け、各ドメインが検証、永続化、認可を処理します。ブラウザーでの検出はセッションに従い、識別情報の変更で再取得します。公開の生存確認は遅い任意コンポーネントの診断を実行しません。

## セキュリティ

保護された処理の前にセッションまたは Bearer のクレームとルート規則を確認します。ロールはリソースの検証を代替しません。認証情報、私的データ、認可判断を公開文書や診断 URL に含めてはいけません。

## リファレンス

- [src/api/main.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/main.ts)
- [src/api/server.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/server.ts)
- [src/api/reuse/route-registry.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/reuse/route-registry.ts)
- [src/api/routes/docs/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/routes/docs/index.ts)
