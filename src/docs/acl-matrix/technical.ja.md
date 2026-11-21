# 技術リファレンス

ACLマトリクス の公開インターフェースと運用規則を説明します。

## インターフェース

Core が `AccessRole` と `RoleAccessPolicy` を公開します。`hasMinRole(role, minRole)` は順位を比較し、`isRoleAllowed(role, { minRole, onlyRole })` は両条件を検証します。認証ガードが現在のクレームを取得してからルート方針を適用します。

## 設定

`minRole` は指定以上のロールを許可します。`onlyRole` は上位でも指定と異なれば拒否します。所有権、公開範囲、参加資格、委譲共有の検証は別途行います。

## 動作

順位は `user < teacher < moderator < admin < owner` です。自己登録は `user` を作成します。`founder` は AccessRole ではなく、招待資格は登録方針で確認します。ロール順位だけではプロフィール、ファイル、ルーム、クラスの権限を決定しません。

## セキュリティ

実行時にロールと対象の権限を確認します。非表示の操作は認可境界ではなく、説明上のロールは onlyRole や現在の参加資格を上書きしません。

## リファレンス

- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/core/contracts/access-policy.ts)
- [src/gateways/auth/guard.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/gateways/auth/guard.ts)
