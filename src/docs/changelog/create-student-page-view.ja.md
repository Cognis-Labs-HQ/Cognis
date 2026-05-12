# 生徒クラスメンバーシップ・教師クラス管理機能

## 概要

生徒向けの「マイクラス」ページを `/my-classes` に追加しました。参加中のクラスの確認、利用可能なクラスへの参加申請、クラスからの退会ができます。また、教師向けクラスページを拡張し、言語フィルター、クラスごとの生徒管理、生徒検索、生徒の招待、参加申請の承認・却下機能を追加しました。

## 変更されたファイル・コンポーネント

- `src/adapters/study/classes/store.ts` — `class_memberships` テーブルとストアメソッドを追加
- `src/adapters/study/classes/routes.ts` — 生徒・教師向けクラス管理APIエンドポイントを追加
- `src/adapters/study/classes/index.ts` — `/my-classes` ページルートを追加；`accountExists` ケーパビリティを接続
- `src/adapters/study/classes/ui/my-classes.html` — 生徒向け新規HTMLページ
- `src/adapters/study/classes/ui/my-classes.js` — 生徒向け新規JavaScriptページ
- `src/adapters/study/classes/ui/app.js` — 言語フィルターと生徒管理機能を備えた教師ビューの拡張
- `src/adapters/study/classes/ui/classes.css` — 新UIエレメント用スタイルを追加
- `src/gateways/study/ui/classes-dashboard-element.js` — 生徒向けダッシュボード要素を追加
- `src/ui/languages/*/strings.xml` — 新i18n文字列（全4言語）
- `src/adapters/study/classes/package.json` — バージョンを1.2.0に更新
- `src/docs/versions.en.md` — コンポーネントバージョンを更新

## コミット

コミット履歴はブランチ `copilot/create-student-page-view` を参照してください。
