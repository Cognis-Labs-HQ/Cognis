# 技術リファレンス

Cognis は、ホストの調整処理、ドメインのゲートウェイ、アダプター、外部導入モジュールを分離します。

## インターフェース

[Core](/docs/core/technical) は ctx とライフサイクル契約、[API](/docs/api/technical) は HTTP 処理を提供します。[ゲートウェイ](/docs/gateways/technical) はドメイン操作を登録し、[アダプター](/docs/adapters/technical) は提供者やドメイン固有の処理を実装します。Profile と Messages は Social のアダプターです。ブラウザー側は [UI](/docs/ui/technical) の契約を使います。

## 設定

ホスト環境は検出先、データベース接続、保存先を指定し、管理画面は任意コンポーネントの有効状態を指定します。外部ソースと導入は[モジュール](/docs/modules/external/technical)が説明します。アカウント設定はサーバーのデータベースを選択しません。

## 動作

マニフェストが依存順序を定め、起動時に公開機能、フロー、ルート、UI 情報を登録します。利用側は他の実装を直接読み込まず、登録を取得します。失敗や無効化で所有者の登録を解除します。Docs は公開メタデータから完全な言語別文書群とバージョンを検出します。

## セキュリティ

アーキテクチャーは所有境界を示し、包括的な権限を与えません。アカウント、共有ゲスト、外部モジュールには別々の規則があります。リソース操作は所有者の現在の認可を検証します。

## リファレンス

- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/api/bootstrap/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/bootstrap/gateway.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
