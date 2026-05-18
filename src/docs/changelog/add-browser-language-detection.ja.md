# PR変更履歴 — ブラウザー言語検出の追加

## 概要

UI言語の初期化で、初回表示時にブラウザーの言語設定を優先して参照し、
その言語がアプリでサポートされている場合に初期表示言語として適用する
ようにしました。

登録ページの言語ドロップダウンは、検出されたサポート言語を自動選択し、
ユーザーが手動で変更するまでその選択を維持します。

言語優先順位はページ更新のたびにブラウザー／システム設定から再評価される
ため、ブラウザーやOSの言語変更が即座に反映され、英語は常にフォールバック
として維持されます。

## 変更されたコンポーネントとファイル

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## コミット

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
- [d9550aa2](https://github.com/le-firehawk/Cognis/commit/d9550aa2)
- [a70d7e70](https://github.com/le-firehawk/Cognis/commit/a70d7e70)
- [c8634d6e](https://github.com/le-firehawk/Cognis/commit/c8634d6e)
