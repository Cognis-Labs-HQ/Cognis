# Jitsi Meet 無効時に管理画面 → Meetings を非表示にする

## 概要

- Jitsi Meet モジュールが無効のとき、管理画面の Meetings セクションが非表示になるよう修正しました。
- `AdminSection` インターフェースに `isEnabled` を追加し、モジュールが提供する管理セクションがモジュールの有効状態を反映できるようにしました。
- `/api/v1/admin/sections` エンドポイントは `isEnabled` が false を返すセクションをフィルタリングするようになりました。
- モジュール拡張ルートの `registerAdminSection` に `isEnabled` を注入するよう修正しました。これは `registerNavbarPlugin`、`registerSpaRoute`、`registerSettingsSection` と同様の動作です。

## 変更ファイル/コンポーネント

- `src/api/ui-registry.ts`
- `src/api/routes/gateways/index.ts`
- `src/modules/routes/module-extensions.ts`
- `src/api/tests/gateways/gateway-routes.test.ts`
- `src/api/package.json`
- `src/modules/package.json`
- `src/docs/versions.en.md`

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/46e8aae8353774aef82d36f294e0cb566ba29cc3
