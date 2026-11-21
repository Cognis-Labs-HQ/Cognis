# 安定したカレンダーテスト

**機能ブランチ:** feature-calendar-loader-linking

## 共通の依存先を一度だけリンク

カレンダーダイアログのテストでは、各ローカルモジュールを一度だけ読み込み、依存関係グラフ全体をリンクしてから評価します。ファイルの読み込みを意図的に遅らせてインポートを重ねるテストにより、共通の依存先で断続的に発生するリンクエラーを防ぎます。カレンダーの実行時の動作は変わりません。

## コミット

- [983792abacfce6de3bda6ec69a6b9b85c8c1e634](https://github.com/Cognis-Labs-HQ/Cognis/commit/983792abacfce6de3bda6ec69a6b9b85c8c1e634)
