# ログストリームフィルター、警告デフォルト、ローテーション

**機能ブランチ:** copilot/add-log-failed-logins-and-rotation

## 概要

- ログイン失敗と重要なユーザーアカウント変更を警告レベルで記録するように変更しました。
- ログファイルには全ログレベルを保存するように変更しました。
- `LOG_LEVEL` を管理ログストリームの基準フィルターとして適用するようにしました。
- ローテーション済みログを gzip 圧縮するバックエンドのログローテーションを追加しました。
- 管理画面ログ UI の優先度フィルター既定値を警告に設定しました。

## 変更ファイル/コンポーネント

- `src/gateways/logging/logger.ts`
- `src/gateways/logging/bootstrap.ts`
- `src/gateways/logging/ui/admin-section.js`
- `src/api/routes/users/index.ts`
- `src/gateways/logging/tests/*`
- `src/api/tests/users/user-routes.test.ts`
- `src/gateways/logging/manifest.json`
- `src/docs/versions.en.md`
- `src/gateways/logging/docs/index.*.md`
- `src/docs/devops.*.md`

## コミットリンク

- [749469a](https://github.com/Cognis-Labs-HQ/Cognis/commit/749469a351ca8fad839ef6cf3f3d4eed81717b3a)
