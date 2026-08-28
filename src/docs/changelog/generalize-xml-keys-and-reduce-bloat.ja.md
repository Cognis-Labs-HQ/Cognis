# i18n文字列の汎用化とコアの肥大化解消

## 概要

コンポーネント固有のi18nキーをコア言語ファイルから各コンポーネントの`languages/`ディレクトリに移動しました。コンポーネントがグローバル名前空間を汚染せずに独自の文字列を読み込めるよう、i18nレイヤーに`loadComponentStrings`と`extendI18n`を追加しました。コアの文字列ファイルから約90個の不使用・誤配置キーを削除しました。

## 変更ファイルとコンポーネント

- `src/ui/reuse/i18n.js` — `loadComponentStrings`、`extendI18n`、および`componentStringBaseUrls`オプションを追加
- `src/api/ui-registry.ts` — `AdminSection`インターフェースに`stringsBaseUrl`フィールドを追加
- `src/ui/app/administration/index.js` — `loadGatewaySection`を`extendI18n`を使用するよう更新
- `src/adapters/notify/internal/ui/languages/*/strings.xml` — 新しいコンポーネント文字列（en, de, ja, id）
- `src/gateways/notify/ui/languages/*/strings.xml` — 新しいコンポーネント文字列（en, de, ja, id）
- `src/gateways/auth/ui/languages/*/strings.xml` — 新しいコンポーネント文字列（en, de, ja, id）
- `src/gateways/registration/ui/languages/*/strings.xml` — 新しいコンポーネント文字列（en, de, ja, id）
- `src/gateways/study/ui/languages/*/strings.xml` — 新しいコンポーネント文字列（en, de, ja, id）
- `src/gateways/notify/bootstrap.ts` — 管理セクション登録に`stringsBaseUrl`を追加
- `src/gateways/auth/bootstrap.ts` — `stringsBaseUrl`付きの`registerAdminSection`を追加
- `src/gateways/registration/bootstrap.ts` — 管理セクション登録に`stringsBaseUrl`を追加
- `src/adapters/notify/internal/ui/navbar-plugin.js` — コンポーネント文字列キーを使用するよう更新
- `src/gateways/notify/ui/admin-section.js` — コンポーネント文字列キーを使用するよう更新
- `src/gateways/auth/ui/admin-section.js` — コンポーネント文字列キーを使用するよう更新
- `src/gateways/registration/ui/admin-section.js` — コンポーネント文字列キーを使用するよう更新
- `src/gateways/study/ui/navbar.js` — コンポーネント文字列キーを使用するよう更新
- `src/ui/app/profile/index.js` — 統計ラベルを`ui.reuse.profile_preview.*`に更新
- `src/ui/app/settings/index.js` — フォント見出しキーを更新
- `src/ui/app/settings/study-prefs.js` — 教師申請キーを更新
- `src/ui/app/classes/index.js` — 言語ラベルキーを更新
- `src/ui/app/users/index.js` — save_failedキーを`ui.reuse.generic.save_failed`に更新
- `src/ui/languages/*/strings.xml` — 約90個の不使用/移動済みキーを削除、`ui.reuse.generic.save_failed`を追加

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/8e82369
- https://github.com/Cognis-Labs-HQ/Cognis/commit/867e397
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8ef54f9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f624f07
