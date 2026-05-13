# 生徒クラスメンバーシップ・教師クラス管理機能

## 概要

生徒向けの「マイクラス」ページを `/my-classes` に追加しました。参加中のクラスの確認、利用可能なクラスへの参加申請、クラスからの退会ができます。また、教師向けクラスページを拡張し、言語フィルター、クラスごとの生徒管理、生徒検索、生徒の招待、参加申請の承認・却下機能を追加しました。

さらに、ユーザー設定の「学習」セクションを専用の `/study` ハブページに置き換えました。ナビゲーションバーの「学習」ボタンは直接 `/study` へ遷移します。新しいページは新規ユーザー向けにアニメーション付きのウェルカム画面を表示し、登録済みの学習モジュールへのリンクを含む言語ハブを表示します。

ユーザーページとダッシュボードのロールラベルが完全にローカライズされました。

## 変更されたファイル・コンポーネント

- `src/adapters/study/classes/store.ts` — `class_memberships` テーブルとストアメソッドを追加
- `src/adapters/study/classes/routes.ts` — 生徒・教師向けクラス管理APIエンドポイントを追加
- `src/adapters/study/classes/index.ts` — `/my-classes` ページルートを追加；`accountExists` ケーパビリティを接続
- `src/adapters/study/classes/ui/my-classes.html` — 生徒向け新規HTMLページ
- `src/adapters/study/classes/ui/my-classes.js` — 生徒向け新規JavaScriptページ
- `src/adapters/study/classes/ui/app.js` — 言語フィルターと生徒管理機能を備えた教師ビューの拡張
- `src/adapters/study/classes/ui/classes.css` — 新UIエレメント用スタイルを追加
- `src/gateways/study/ui/classes-dashboard-element.js` — 生徒向けダッシュボード要素を追加
- `src/gateways/study/bootstrap.ts` — 設定セクション登録を削除；`/study` ページルートを追加；バージョンを 1.3.0 に更新
- `src/gateways/study/manifest.json` — バージョンを 1.3.0 に更新
- `src/gateways/study/ui/navbar.js` — 通常のナビリンクに簡略化；ポップアップハンドラーを削除
- `src/gateways/study/ui/study.html` — `/study` ページ用の新しい HTML シェル
- `src/gateways/study/ui/study.js` — `createPageComposer` を使用した新しい学習ハブページモジュール
- `src/gateways/study/ui/study.css` — 学習ハブとウェルカム画面用の新しい CSS
- `src/gateways/study/ui/languages/*/strings.xml` — 新しい `gateway.study.*` ページ文字列（全4言語）
- `src/ui/reuse/app-router.js` — `/study` ルートを追加
- `src/ui/layouts/dashboard-layout.js` — 学習ショートカットを `/study` に更新
- `src/ui/styles/settings.css` — 不要な学習用 CSS クラスを削除
- `src/ui/languages/*/strings.xml` — `ui.reuse.role_*` キーを追加；`ui.app.settings.study.*` を復元（全4言語）
- `src/ui/app/users/index.js` — ロールラベルが i18n キーを使用するように変更
- `src/ui/app/dashboard/index.js` — ロール表示が i18n キーを使用するように変更
- `src/adapters/study/classes/package.json` — バージョンを1.2.0に更新
- `src/docs/versions.en.md` — コンポーネントバージョンを更新

## コミット

コミット履歴はブランチ `copilot/create-student-page-view` を参照してください。
