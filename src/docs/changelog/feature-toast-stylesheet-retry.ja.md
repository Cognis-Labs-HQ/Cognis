# トーストのスタイル復旧

**機能ブランチ:** feature-toast-stylesheet-retry

## 通知のスタイルを再読み込み

トーストのスタイル読み込みは、各サイクルで最大2回、各5秒まで試行します。同時の通知は試行を共有し、失敗時にはリスナーと自身のリンクを解放します。後続の通知では再試行できます。既存のスタイルシートの所有権は元の読み込み元に残ります。読み込み中に閉じたトーストは再表示されません。

## コミット

- [4eaddc1578dc3e155eda8aec1df7a8a2cb790299](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eaddc1578dc3e155eda8aec1df7a8a2cb790299)
