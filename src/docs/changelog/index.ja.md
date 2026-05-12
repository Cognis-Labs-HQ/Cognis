# 変更履歴

## 概要

このディレクトリには、プルリクエストごとに 1 つの Markdown ファイルとして
変更履歴を保存します。各ファイルは単一の PR を対象とし、履歴をモジュール化
して監査しやすくします。

## エントリー形式

- ファイル名: `<branch-name-without-copilot-prefix>.ja.md`（例:
  ブランチ `copilot/fix-auth-bug` は `fix-auth-bug.ja.md`）
- PR ごとに 1 ファイル
- 含める内容:
    - PR タイトル
    - 要約
    - 変更されたコンポーネント/ファイル
    - コミットリンク

## エントリー

- [cleanup-strings-and-codebase](./cleanup-strings-and-codebase.ja.md)
