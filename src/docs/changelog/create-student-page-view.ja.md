# 生徒クラスメンバーシップ・教師クラス管理・学習ハブ

## 概要

生徒向けの「マイクラス」ページを `/my-classes` に追加しました。参加中のクラスの確認、利用可能なクラスへの参加申請、クラスからの退会ができます。また、教師向けクラスページを拡張し、言語フィルター、クラスごとの生徒管理、生徒検索、生徒の招待、参加申請の承認・却下機能を追加しました。

ユーザー設定の「学習」セクションを学習ハブ（`/study`）に置き換えました。`/study/welcome` の一度限りのウェルカム画面では、言語モジュール（日本語など）が登録した言語の中から学習言語を選択できます。導入完了後は、グローバルナビゲーション直下に Composer 管理の新しいサブナビゲーション行を表示します。これはサイドのツールバーとは別スタイルで、言語モジュールの子 UI から動的に構築され、言語設定は `/study/settings` を使用します。言語リストはデータベースのテーブルではなく、学習ゲートウェイ（登録済みモジュール）から直接取得されます。

ユーザーページとダッシュボードのロールラベルが完全にローカライズされました。

## 変更されたファイル・コンポーネント

- `src/adapters/study/classes/store.ts` — `class_memberships` テーブルとストアメソッドを追加
- `src/adapters/study/classes/routes.ts` — 生徒・教師向けクラス管理APIエンドポイントを追加
- `src/adapters/study/classes/index.ts` — `/my-classes` ページルートを追加；`accountExists` ケーパビリティを接続
- `src/adapters/study/classes/ui/my-classes.html` — 生徒向け新規HTMLページ
- `src/adapters/study/classes/ui/my-classes.js` — 生徒向け新規JavaScriptページ
- `src/adapters/study/classes/ui/app.js` — 言語フィルターと生徒管理機能を備えた教師ビューの拡張
- `src/adapters/study/classes/ui/classes.css` — 新UIエレメント用スタイルを追加
- `src/gateways/study/gateway.ts` — 言語モジュールのメタデータ追跡を追加し、登録言語に有効化情報を保持
- `src/gateways/study/bootstrap.ts` — `/study/welcome`、`/study`、`/study/settings` ルート（共有HTML）；`GET /api/v1/study/registered-languages` エンドポイントを追加；言語一覧と子ルートをモジュール有効化状態でフィルタリング
- `src/gateways/study/manifest.json` — バージョンを 1.4.0 に更新
- `src/gateways/study/ui/classes-dashboard-element.js` — 生徒向けダッシュボード要素を追加
- `src/gateways/study/ui/navbar.js` — 通常のナビリンクに簡略化；ポップアップハンドラーを削除；ロード時に登録済み言語を取得し、利用可能な言語がない場合はリンクを無効化
- `src/ui/styles/reuse/layout.css` — `.topnav a[aria-disabled="true"]` ルールを追加し、無効化されたナビ項目を視覚的に薄く表示してクリックを無効化
- `src/gateways/study/ui/study.html` — `/study` と `/study/welcome` 用の HTML シェル
- `src/gateways/study/ui/study.js` — 書き直し：一度限りのオンボーディング（`/study/welcome`）、ダッシュボード（`/study`）、設定（`/study/settings`）、モジュール提供サブ項目ナビゲーション、サブナビ上の有効言語ドロップダウン
- `src/gateways/study/ui/study.css` — スタイル更新：モジュールサブナビ構成、有効言語ドロップダウン、50/50 言語設定パネル
- `src/gateways/study/ui/languages/*/strings.xml` — `gateway.study.available_languages` と `gateway.study.active_languages` キーを追加（全4言語）
- `src/ui/reuse/app-router.js` — `/study`、`/study/welcome`、`/study/settings` のみを学習ハブにルーティングし、モジュールページは専用ハンドラーを使用
- `src/ui/reuse/page-composer.js` — サイドツールバーと分離した Composer の新規サブナビゲーションスロットを追加
- `src/ui/layouts/dashboard-layout.js` — レイアウトの `subNavigation` スロット配線を追加
- `src/ui/public/templates/dashboard-layout.html` — グローバルナビゲーション直下にサブナビゲーション行プレースホルダーを追加
- `src/ui/styles/reuse/layout.css` — 新しい Composer サブナビゲーション行のグローバルスタイルを追加
- `src/ui/layouts/dashboard-layout.js` — 学習ショートカットを `/study` に更新
- `src/ui/styles/settings.css` — 不要な学習用 CSS クラスを削除
- `src/ui/languages/*/strings.xml` — `ui.reuse.role_*` キーを追加；`ui.app.settings.study.*` を復元（全4言語）
- `src/ui/app/users/index.js` — ロールラベルが i18n キーを使用するように変更
- `src/ui/app/dashboard/index.js` — ロール表示が i18n キーを使用するように変更
- `src/adapters/study/classes/package.json` — バージョンを1.2.0に更新
- `src/docs/versions.en.md` — コンポーネントバージョンを更新
- `src/gateways/study/tests/bootstrap.test.ts` — 日本語モジュールの無効/有効状態での取り込みを検証するゲートウェイテストを追加

- `src/gateways/study/bootstrap.ts` — modules テーブルへの直接照会を廃止し、`study:setLanguageModuleEnabled` Capability による Study 所有の可用性取り込みへ変更
- `src/gateways/study/gateway.ts` — 言語モジュール可用性のゲートウェイ内状態 API を追加し、言語一覧と子ルートの公開を制御
- `src/api/server.ts` と `src/api/main.ts` — モジュール有効化/無効化と起動時状態復元から Study Gateway へ言語可用性をプッシュする配線を追加
- `src/gateways/study/manifest.json` と `src/docs/versions.en.md` — Study Gateway のバージョンを 1.5.0 に更新

## コミット

コミット履歴はブランチ `copilot/create-student-page-view` を参照してください。
