# 信頼できる通知受信トレイ

**機能ブランチ:** feature-notification-inbox-outcomes

## 確認済みの状態を維持

読み込み失敗時も確認済みの通知、検索結果、未読数を保持します。「再試行」は書き込みを再送せずに受信トレイを確認します。拒否、結果不明、変更確認済みで更新失敗の各状態を別のメッセージで通知します。

## 受信トレイの有効期間を遵守

内部通知 0.5.36 はアダプター所有のフローで内容、順序、既読状態を反映します。古い要求、削除された操作要素、アカウント変更、プロバイダー破棄によって新しい受信トレイが上書きされることを防ぎます。継続ポップアップの方針とワークスペースのチュートリアル対象は維持します。

## コミット

- [43d6a5ae8fd964d097a1689d54aafd1b0483e30d](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d6a5ae8fd964d097a1689d54aafd1b0483e30d)
- [ab9b731fe6960c954ebfb79df6e28ee5fd0d401a](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab9b731fe6960c954ebfb79df6e28ee5fd0d401a)
- [b8d3ebd1c83345ef615ee397a3c6310bcff61f65](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8d3ebd1c83345ef615ee397a3c6310bcff61f65)
