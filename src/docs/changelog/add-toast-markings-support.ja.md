# ライトモードでのトースト・アイコンの表示修正

## 概要

ライトモードでトースト通知のアイコン（エラー ✕、成功 ✓、警告 ⚠、情報 ℹ）が表示されない不具合を修正しました。ライトモードでは `--color-danger-text` と `--color-success-text` が `#fff`（白い背景に白文字）に解決されるため、アイコンが見えなくなっていました。ライトモード用の上書きルールを追加し、アウトライン用カラートークンを使用することでアイコンを明確に表示します。

## 変更されたファイル・コンポーネント

- `src/ui/styles/reuse/toast.css` — エラー、成功、警告のトースト変種に対してアイコンの色を上書きする `body[data-theme="light"]` ルールを追加。
- `src/ui/styles/reuse/theme.css` — トークンが常に定義されるよう、`--color-danger-outline-text` と `--color-success-outline-text` を `:root`（ダークモード値）に追加。

## コミットリンク

- https://github.com/Cognis-Labs-HQ/Cognis/commit/1305bfc163422709964268baafe8b0036c7b5c10
