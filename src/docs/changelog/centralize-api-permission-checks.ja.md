# PR変更履歴 — API権限チェックの一元化

**機能ブランチ:** copilot/centralize-api-permission-checks

## 概要

`owner`ロールのユーザースコープAPIにおける認可ギャップを修正し、
ロールアクセス判定を共通化しました。

さらに、拡張可能なロールポリシー機構を追加しました。

- モジュール由来のAPIルートは `minRole`（階層ベース）または
  `onlyRole`（単一ロール限定）を宣言可能。
- モジュール・ゲートウェイ・アダプター由来のUIページ/拡張も
  同じポリシーを宣言でき、中央でフィルタリングされます。

UIのロール表示も改善し、`owner` と `admin` を明確に区別し、
`moderator` を正式な選択肢として扱うようにしました。

## 変更コンポーネント/ファイル

- 認可ポリシーの共通処理:
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- モジュールAPIルートのロールポリシー対応:
    - `src/modules/routes/module-extensions.ts`
    - `src/modules/sample-analytics/api/index.js`
    - `src/modules/routes/tests/module-extension-routes.test.ts`
- モジュールUIルート宣言のロールポリシー対応:
    - `src/api/routes/ui/index.ts`
    - `src/modules/sample-analytics/routes.json`
    - `src/core/services/module-service.ts`
- UI拡張（gateway/adapter/module）のロールフィルタ対応:
    - `src/api/ui-registry.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/tests/ui/ui-routes.test.ts`
    - `src/api/tests/gateways/gateway-routes.test.ts`
- ロール表示ラベルとUI出力改善:
    - `src/ui/reuse/access-role.js`
    - `src/ui/app/users/index.js`
    - `src/ui/app/dashboard/index.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- モジュールフレームワーク文書:
    - `src/modules/docs/index.en.md`

## コミット

- [93e5f7f](https://github.com/Cognis-Labs-HQ/Cognis/commit/93e5f7f)
- [411e267](https://github.com/Cognis-Labs-HQ/Cognis/commit/411e267)
