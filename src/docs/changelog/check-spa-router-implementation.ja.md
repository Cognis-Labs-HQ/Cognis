# PR変更履歴 — SPAルーター実装チェック

## 概要

ページエントリーポイントのSPA整合性を見直し、招待ページのルーター
対応を追加するとともに、認証ページと招待ページで `mount()` +
直接読み込みガードのパターンを統一しました。

あわせて、ログイン/登録ページのコンポーザーメタデータを必須の
`pageContext`（タイトル + サブタイトル）に合わせ、モジュール一覧を
小画面でも扱いやすいレスポンシブ表コンテナへ改善しました。

## 変更コンポーネントとファイル

- ルーターとSPAテスト:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- ページエントリーポイント:
    - `src/ui/app/invite/index.js`
    - `src/ui/app/login/index.js`
    - `src/ui/app/register/index.js`
    - `src/ui/app/modules/index.js`
- UI言語リソース:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`

## コミット

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
