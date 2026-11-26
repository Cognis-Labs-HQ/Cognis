# 技術リファレンス

アダプターは、導入された機能に対し、担当ゲートウェイの契約に沿った実装、登録、設定を提供します。

## インターフェース

アダプターは `src/adapters/<gateway>/<adapter>/` に配置され、パッケージの入口から担当ゲートウェイが要求するファクトリーまたは起動フックを公開します。任意の `defineContracts(ctx)` は `system:contracts` を通じて自身の実行時契約を宣言します。

## 設定

提供者の設定は担当ゲートウェイの設定スキーマと設定ルートで定義されます。認証情報、有効状態、接続要件はアダプターごとに異なります。[ゲートウェイ契約](/docs/gateways/technical)に検出とライフサイクルの境界を示します。

## 動作

アダプターはドメインのストア、ルート、UI を所有できます。Social Profile は Social のアダプターであり、ゲートウェイではありません。データベースドライバーは構造化コマンドを実行し、アカウント、プロフィール、メッセージのスキーマは各ドメインが所有します。登録は所有者のスコープに属し、起動失敗や無効化で解除されます。

## セキュリティ

コンポーネント間の操作には公開された ctx 機能またはフローを使用します。パッケージのインポートや有効化だけでは利用者の権限を確立できません。診断に認証情報を含めてはいけません。

## リファレンス

- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/adapters/social/profile/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/index.ts)
