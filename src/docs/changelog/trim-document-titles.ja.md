# UI で長いドキュメントタイトルを短縮

**Feature Branch:** copilot/trim-document-titles

## 概要

- 長いドキュメントタイトルが Docs ナビゲーション UI で省略表示されるようになりました。
- レンダリングされたドキュメント見出しは視覚的に 30 文字幅までに制限され、長い見出しでも全文はホバー情報として保持されます。
- 専用の Docs スタイルシートを Docs ページで読み込むようにし、この省略表示の挙動をテストでカバーしました。

## 変更されたファイル / コンポーネント

- `src/ui/app/docs/index.js`
- `src/ui/public/pages/docs.html`
- `src/ui/styles/docs.css`
- `src/ui/tests/docs-links.test.js`

## コミットリンク

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e8f614f1abf5a1453253da61913b2c38c07a897a
