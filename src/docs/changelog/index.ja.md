# 変更履歴

## 概要

このディレクトリには、プルリクエストごとに 1 つの Markdown ファイルとして
変更履歴を保存します。各ファイルは単一の PR を対象とし、履歴をモジュール化
して監査しやすくします。

## エントリー形式

- ファイル名: `<branch-name-without-copilot-prefix>.<言語コード>.md`（サポート対象の全言語: de、en、id、ja）。
  例: ブランチ `copilot/fix-auth-bug` は `fix-auth-bug.en.md`、
  `fix-auth-bug.de.md`、`fix-auth-bug.id.md`、`fix-auth-bug.ja.md` を生成します
- PR ごとに 1 セットのファイル（言語ごとに 1 ファイル）
- 含める内容:
    - PR タイトル
    - 要約
    - 変更されたコンポーネント/ファイル
    - コミットリンク

## エントリー

- [cleanup-strings-and-codebase](./cleanup-strings-and-codebase.ja.md)
