# 技術リファレンス

ゲートウェイの起動処理は、ドメインの公開契約、ルート、任意のアダプターをホストに接続します。

## インターフェース

`bootstrap(ctx)` は、機能、ルート、ゲートウェイ、UI の各レジストリー、フロー、アダプターのルート、ログ機能を持つ `GatewayBootstrapContext` を受け取ります。ゲートウェイは `system:contracts` に版付き契約を宣言し、アダプターは `defineContracts(ctx)` で自身の契約を宣言できます。

## 設定

検出先は `COGNIS_GATEWAYS_ROOT` と `COGNIS_ADAPTERS_ROOT` で指定します。マニフェストには `id`、不変の `uuid`、`version`、UUID に基づく `requires` を記載します。`documentation` は言語別の `docs/README.en.md`、`docs/USAGE.en.md`、`docs/TECHNICAL.en.md` を指定します。翻訳要件は[文書標準](/docs/standard/technical)を参照してください。

## 動作

GatewayService は起動処理を検出し、依存関係順に実行します。実行時バージョンには二重の定数を置かず `readGatewayManifestVersion` を使用します。登録は起動スコープに属し、失敗時には解除されます。アダプターローダーはドメイン固有のコンテキストを渡し、フックとファクトリーは担当ゲートウェイで異なります。手順は[使用例](/docs/gateways/usage)を参照してください。

## セキュリティ

利用側は他の実装をインポートせず、公開機能または名前付きフローを使います。必須契約が利用できることを確認してから操作を実行します。アカウントとリソースの認可は、担当ドメインのルートと変更処理で検証します。

## リファレンス

- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/core/services/gateway-service.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/services/gateway-service.ts)
- [src/gateways/reuse/manifest-version.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/manifest-version.ts)
- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
