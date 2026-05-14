# PR変更履歴 — SPAルーター実装チェック

## 概要

ページエントリーポイントのSPA整合性を見直し、招待ページのルーター
対応を追加するとともに、認証ページと招待ページで `mount()` +
直接読み込みガードのパターンを統一しました。

あわせて、ログイン/登録ページのコンポーザーメタデータを必須の
`pageContext`（タイトル + サブタイトル）に合わせ、モジュール一覧を
小画面でも扱いやすいレスポンシブ表コンテナへ改善しました。

その後の追補として、初期シェル描画をブロックしていた処理も削減し
ました。ダッシュボードテンプレートは事前ウォームされ、ナビバー
プラグインの読み込みは遅延実行され、ページ内容は保存済みレイアウト
設定の取得完了を待たずに初回描画されます。

メッセージ、クラス、マイクラスのアダプターページの `pageContext` に
欠落していた `subtitle` フィールドを追加し、すべてのページコンテキストに
i18n キーで解決されたタイトルとサブタイトルの両方を必須とするAI指示への
完全準拠を達成しました。

ひらがな一覧のStudyコンポーネントを修正しました。`createI18n` の呼び出しに
`componentStringBaseUrls` がなく（gateway文字列が読み込まれていなかった）、
英語のページタイトルが直接コードに埋め込まれており、サブタイトルも存在せず、
要素ラベルとレンダリングコンテンツにも英語文字列が直接埋め込まれていました。
これらすべての問題を `gateway.study.*` i18n 名前空間で解決しました。

英語アルファベットコンポーネントの直接埋め込みページタイトルも同様に修正
しました。

対応するすべての i18n キーを4つのサポート言語（de・en・id・ja）に追加
しました。グローバル `strings.xml` ファイルには言語ごとに3つの新しい
サブタイトルキーを、Study ゲートウェイの `strings.xml` ファイルには
言語ごとに5つの新しいキーをそれぞれ追加しました。

## 変更コンポーネントとファイル

- ルーターとSPAテスト:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- シェル/レイアウト性能:
    - `src/ui/layouts/dashboard-layout.js`
    - `src/ui/reuse/page-composer.js`
    - `src/ui/tests/page-composer-refresh.test.js`
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
