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
- 各ファイルの必須構造:
    - `# ...` — 変更履歴タイトル
    - `## ...` — 見出しごとに 1 つの変更点（要約の箇条書きとして表示）
    - 各 `##` 配下の本文 — 変更履歴ページで表示する詳細内容

## エントリー

- [create-changelog-ingestion-system](/changelogs/create-changelog-ingestion-system)
- [cleanup-strings-and-codebase](/changelogs/cleanup-strings-and-codebase)
- [expand-classes-adapter-ui](/changelogs/expand-classes-adapter-ui)
