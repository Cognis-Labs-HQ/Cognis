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
- `src/modules/study/languages/ja/components/hiragana-alphabet/ui/index.html` — グローバルスタイルシート（`page-builder.css`、`reuse/page-sections.css`、`study.css`）と完全な PWA メタタグを追加し、ハードリロード時にも正しく表示されるようにした
- `src/modules/study/languages/ja/components/library/ui/index.html` — 同上：グローバルスタイルシートと PWA ボイラープレートを追加；`lang` 属性を `en` から `ja` に修正
- `src/modules/study/languages/en/components/alphabet/ui/index.html` — 同上：グローバルスタイルシートと PWA ボイラープレートを追加
- `src/ui/layouts/dashboard-layout.js` — 新規描画とシェル再利用の両パスで `hidden` 属性の切り替えではなく `.page-subnav` 要素の追加・削除を行うよう変更。ツールバー・フッター・ヘッダーと同じパターンに統一
- `src/ui/styles/reuse/layout.css` — `.site-header` を `position: sticky; top: 0; z-index: 1200` に変更し、ヘッダー全体（トップバー・ナブロー・サブナビゲーション）がスクロール時に即座に上部に固定されるようにした。`.global-navrow` とレスポンシブブレークポイントから冗長な `position: sticky`、`top`、`z-index` の宣言を削除
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

- `src/gateways/study/ui/study.js` — 直接読み込み時のトップレベル mount 呼び出しを try/catch で保護し、Study SPA の import 失敗を安全に記録
- `src/adapters/study/classes/ui/my-classes.js` — 直接読み込み時のトップレベル mount 呼び出しを try/catch で保護し、SPA import の耐障害性を向上
- `src/ui/reuse/app-router.js` — ルート照合ロジック内のクリーン済みパス変数名を明確化

- `src/gateways/study/ui/study.js` と `src/gateways/study/ui/study.css` — Study サブナビの「有効な言語」ラベルを削除し、言語オプションを直接表示、設定ギアを言語オプションの右側へ移動
- `src/gateways/study/ui/study.js` と `src/gateways/study/ui/languages/*/strings.xml` — 最後の有効な学習言語を削除する前に確認用の警告ポップアップを追加し、確認後に `/study/welcome` へ遷移
- `src/modules/study/languages/ja/index.ts` — 日本語モジュールの子ルートをゲートウェイ前段の汎用 URL（`/study/hiragana`, `/study/library`）へ変更
- `src/modules/study/languages/ja/components/*/ui/app.js` — 日本語モジュールページを `createPageComposer` を使う SPA `mount()` エントリへ移行し、共通ページ構造を適用
- `src/ui/reuse/app-router.js` — `/study/hiragana` と `/study/library` の SPA ルーティングを追加
- `src/modules/study/languages/ja/{package.json,manifest.json}` と `src/docs/versions.en.md` — Cognis Japanese モジュールのバージョンを `1.1.2` に更新

- `src/ui/styles/reuse/layout.css` — `.workspace` から `flex: 1 0 auto` を削除してコンテンツのサイズに合わせるようにし、`.global-footer` に `margin: auto auto 0` を適用して flex カラム内の自動上マージンによりフッターをビューポート下端へ押し下げる；`.page-subnav` の背景を直接 `var(--nav-bg)`（`.global-navrow` と同じ）に変更し `backdrop-filter: blur(8px)` を追加して、下にコンテンツがスクロールされても常に完全不透明に保つ
- `src/ui/styles/reuse/layout.css` と `src/ui/layouts/dashboard-layout.js` — サブナビゲーションの縦方向パディングを少し縮め、四辺すべての角丸を復元し、サブナビゲーションを持つページではスクロール開始後にメインナビ行をたたんでサブナビゲーションがグローバルトップバーへ直接つながるスクロール状態を追加
- `src/ui/layouts/dashboard-layout.js`、`src/ui/styles/reuse/layout.css`、`src/gateways/study/ui/study.css`、および Study 子ページ用サブナビゲーション関連ファイル — Study のサブページでもグローバル navbar の Study 項目がアクティブのままになるようにし、ページ上部での primary navbar と Study サブナビゲーションの隙間や角丸の分断を解消し、言語切替ボタンはそのままに Study モジュールリンクだけをグローバル navbar と同じ見た目へ合わせた

## コミット

コミット履歴はブランチ `copilot/create-student-page-view` を参照してください。

- `src/adapters/study/classes/{store.ts,routes.ts,package.json}`、`src/modules/study/languages/{en,ja}/index.ts`、各言語の新しい classroom UI、Study の reuse アセット、Study Library の UI/store、Study gateway の言語文字列、ドキュメント、Copilot 指示 — 言語ごとの classroom ページ（座席可視化と教師/学習者の役割差分）を追加し、classroom レイアウト/メンバー管理 API を追加、選択言語に依存せず admin へ Library を Study サブナビに表示して言語フィルターを引き継ぐよう改善し、Library/Classroom のドキュメントと指針を拡張
