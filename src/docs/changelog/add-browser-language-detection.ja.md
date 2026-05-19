# PR変更履歴 — ブラウザー言語検出の追加

## 概要

UI言語の初期化で、初回表示時にブラウザーの言語設定を優先して参照し、
その言語がアプリでサポートされている場合に初期表示言語として適用する
ようにしました。

登録ページの言語ドロップダウンは、検出されたサポート言語を自動選択し、
ユーザーが手動で変更するまでその選択を維持します。

不明または未対応の言語コードは言語設定から自動的に除外され、設定画面の
有効な言語一覧に表示されなくなりました。

ユーザーが言語優先順位を手動で変更すると、その順序が以後の基準になります。
後から対応された新しい言語は「利用可能」側に残り、ブラウザー／システムの
言語順序が変わってもアプリ側の優先順位は並び替えられません。

設定→言語ページの「ブラウザーから同期」ボタンを使うと、その時点のブラウザーの言語順序に従って
優先順位をいつでも再同期できます。クリックすると優先言語リストが更新され、優先順位モードが
「自動」にリセットされるため、以後のブラウザー言語変更も再び反映されるようになります。

「利用可能な言語」テーブルは行が0件でも有効なドロップ領域として維持されるようになり、
「ブラウザーから同期」ボタンは「優先言語」見出しの横に配置されるようになりました。

両方の言語テーブルカードが同一の見出し間隔を使用するようになり、見た目が統一されました。
また、「利用可能な言語」テーブルが空の状態で最初の言語をドラッグして戻す際に、
緑のドラッグオーバーハイライトが正しく表示されるようになりました。

## 変更されたコンポーネントとファイル

- `src/ui/reuse/i18n.js`
- `src/ui/app/settings/index.js`
- `src/ui/app/settings/language-prefs.js`
- `src/ui/styles/page-builder.css`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`
- `src/ui/languages/*/strings.xml`

## コミット

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
- [d9550aa2](https://github.com/le-firehawk/Cognis/commit/d9550aa2)
- [a70d7e70](https://github.com/le-firehawk/Cognis/commit/a70d7e70)
- [c8634d6e](https://github.com/le-firehawk/Cognis/commit/c8634d6e)
- [61a470b9](https://github.com/le-firehawk/Cognis/commit/61a470b9)
