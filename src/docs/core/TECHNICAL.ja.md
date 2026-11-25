# 技術リファレンス

Core は ctx の実行、コンポーネントのライフサイクル、提供者に依存しない型契約を定義します。

## インターフェース

`createCtx()` は機能の登録と取得、段階付きフローを公開します。`ctx.flow.exists`、`extend`、`run` は名前付きフローを操作し、実行結果には `data` と `stageResults` が含まれます。`system:contracts` はドメイン所有者が定義する版付き実行時契約のレジストリーです。`AuthAccountStore`、`AccessRole`、`RoleAccessPolicy` は公開された型であり、自動登録される機能 ID ではありません。

## 設定

ストアとレジストリーはホストが渡します。モジュールは固定 UUID、依存関係、入口をマニフェストに宣言します。接続設定は [DB](/docs/gateways/db/technical)、ロールの順序と完全一致の判定は[アクセス規則](/docs/acl-matrix/technical)を参照してください。

## 動作

ゲートウェイとモジュールのサービスは所有者のスコープ内で登録を読み込み、破棄で解除し、起動失敗で取り消します。フローは宣言した段階を順に実行し、後続処理へ結果を渡します。導入、有効化、削除は他の実装を直接インポートせず、ホストのライフサイクルに従います。

## セキュリティ

ライフサイクル管理や契約構造の確認は、リソース操作を認可しません。担当側が保護された操作の前にアカウント、ロール、リソースを検証します。外部モジュールにはホスト内部への無制限なアクセスではなく、範囲を限定した公開契約を渡します。

## リファレンス

- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/core/contracts/auth-account.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/auth-account.ts)
- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/access-policy.ts)
