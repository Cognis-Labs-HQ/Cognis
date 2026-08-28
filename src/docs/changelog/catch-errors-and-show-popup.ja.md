# ランタイムエラーポップアップ

**Feature Branch:** copilot/catch-errors-and-show-popup

## ルート読み込み失敗を捕捉

SPA ルーターはナビゲーション読み込みを `try/catch/finally` で全面的に
保護するようになりました。ルートスクリプトの読み込みに失敗しても、
ローディングオーバーレイは必ず解除され、無限スピナー状態を防ぎます。

## 報告しやすい詳細を表示

ダッシュボードで実行時エラーが発生した場合、エラー概要・スタック
トレース・ページ URL・直近のコンソール出力を含む危険ポップアップを
表示し、ユーザーがそのまま不具合報告へ貼り付けられるようにしました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e4c47c446cf5d1b5d2eceba77a5e1d796735d84d
