# PR変更履歴 — ディレクトリ構造の整理

## 概要

日本語学習コンテンツは言語モジュールで提供されるため、重複して混乱を招く
`src/adapters/study/japanese/` の旧Studyアダプターを削除しました。

Studyゲートウェイのアダプター探索/ブートストラップでは、レガシー用の
ハードコードされたスキップ条件を廃止し、汎用的な処理にしました。

プロフィールページでは、投稿公開範囲の案内をインラインヒント文から
情報ツールチップに置き換えました。

ゲートウェイ・アダプター固有のHTMLページ、JavaScriptアプリモジュール、
CSSスタイルシートを `src/ui/` から各アダプター・ゲートウェイのディレクトリに
移動しました。コンポーネント自己完結の原則に従い、プロフィール・メッセージ・
クラスの各アダプターが `ui/` サブディレクトリから独自の `index.html`、
`app.js`、CSSを提供するようになりました。通知設定とスタディ設定モジュールも
各ゲートウェイの `ui/` ディレクトリに移動し、`createSettingsSection`
エクスポートを追加しました。

`UIRegistry` に `SettingsSection` プラグインシステムを追加し、ゲートウェイが
設定ページのセクションを動的に登録できるようにしました。新たな
`GET /api/v1/ui/settings-sections` エンドポイントで登録済みセクションを
クライアントに公開します。設定ページは貢献されたセクションを動的にインポートして
マウントするようになり、通知・スタディ設定のハードコードされたインポートを
廃止しました。

## 変更したファイル/コンポーネント

- Studyゲートウェイ:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- 削除したレガシーアダプター:
    - `src/adapters/study/japanese/`（削除）
- プロフィールアダプター:
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/ui/index.html`
    - `src/adapters/social/profile/ui/profile.css`
- メッセージアダプター:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/index.html`
    - `src/adapters/social/messages/ui/messages.css`
- クラスアダプター:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/ui/app.js`
    - `src/adapters/study/classes/ui/index.html`
    - `src/adapters/study/classes/ui/classes.css`
- Notifyゲートウェイ:
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/ui/notification-prefs.js`
- Studyゲートウェイ:
    - `src/gateways/study/ui/study-prefs.js`
- UIインフラストラクチャ:
    - `src/api/ui-registry.ts`
    - `src/api/routes/ui/index.ts`
    - `src/ui/app/settings/index.js`
    - `src/ui/reuse/app-router.js`

## コミット

- [e349311](https://github.com/Cognis-Labs-HQ/Cognis/commit/e349311)
- [e81c254](https://github.com/Cognis-Labs-HQ/Cognis/commit/e81c254)

---

## パス2 — Auth・プロフィール・通知UIの共配置

### 概要

誤配置されていたコアファイルをそれぞれの正式な所有者の場所に移動しました。Auth トークンユーティリティ（`access-tokens.ts`、`guard.ts`）を `src/api/auth/` から `src/gateways/auth/` に移動しました。Auth ルートハンドラとそのテストを `src/gateways/auth/routes/` と `src/gateways/auth/tests/` に移動しました。プロフィールルートハンドラとストアインターフェースを `src/api/` から `src/adapters/social/profile/` に移動しました。verify-email ページ（HTML・JS・CSS）を `src/ui/` から `src/gateways/notify/ui/` に移動し、notify ゲートウェイがこのページを担当するようになりました。`src/modules/study-language-ja/` スタブを削除し、そのマニフェストを `src/modules/study/languages/ja/` の日本語モジュールに統合しました。廃止された `src/docs/profile.*` ドキュメントを削除しました。

### パス2コミット

- [34fc21c](https://github.com/Cognis-Labs-HQ/Cognis/commit/34fc21c)
- [47a2c1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/47a2c1a)
- [7916873](https://github.com/Cognis-Labs-HQ/Cognis/commit/7916873)

---

## パス3 — ゲートウェイ無効化ガード・日本語モジュール修正・AI指示

### 概要

Study ゲートウェイを無効化した後も、設定セクションとナビバープラグインがUI上に表示されたままになる回帰を修正しました。`NavbarPlugin` に既存のプレディケートに合わせて `isEnabled` を `SettingsSection` インターフェースに追加し、`GET /api/v1/ui/settings-sections` エンドポイントがレスポンス時にセクションをフィルタリングするようにしました。

管理画面のモジュール一覧に日本語言語モジュールを復元しました。前回のセッションで `src/modules/study-language-ja/` スタブを削除した際、実際のマニフェストパス `src/modules/study/languages/ja/` へのスキャンを拡張しなかったため、スキャナーがそのパスも読み込むよう修正しました。

AIコントリビューター向け指示を強化しました。新設した「コードベースの清潔さは最優先事項」セクションで、非適合コードの導入は一切許容されず、違反を指摘するすべてのフィードバックへの対応が必須であることを明記しました。

### 変更ファイル

- `.github/copilot-instructions.md` — コードベース清潔性の義務を追加。
- `src/api/ui-registry.ts` — `SettingsSection` に `isEnabled` を追加。
- `src/api/routes/ui/index.ts` — 設定セクションのレスポンスを `isEnabled` でフィルタリング。
- `src/gateways/study/bootstrap.ts` — 設定セクションとナビバープラグインを `isEnabled` プレディケートで制御。
- `src/api/main.ts` — Bootstrap が `study/languages/` も言語モジュールマニフェストとしてスキャン。
- `src/api/tests/ui/ui-routes.test.ts` — 設定セクションエンドポイントの新テスト3件追加。

### パス3コミット

- [f4aa63b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4aa63b)
