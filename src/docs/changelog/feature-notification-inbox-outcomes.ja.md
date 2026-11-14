# 信頼できる通知受信トレイ

**機能ブランチ:** feature-notification-inbox-outcomes

## 確認済みの状態を維持

読み込み失敗時も確認済みの通知、検索結果、未読数を保持します。「再試行」は書き込みを再送せずに受信トレイを確認します。拒否、結果不明、変更確認済みで更新失敗の各状態を別のメッセージで通知します。

## 受信トレイの有効期間を遵守

内部通知 0.5.36 はアダプター所有のフローで内容、順序、既読状態を反映します。古い要求、削除された操作要素、アカウント変更、プロバイダー破棄によって新しい受信トレイが上書きされることを防ぎます。継続ポップアップの方針とワークスペースのチュートリアル対象は維持します。

## コミット

- [bfe50b2267dc95ae3fd81837520344788856793c](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfe50b2267dc95ae3fd81837520344788856793c)
- [2a65d78ced8d7cfbcbd2e414b52c90780bd6409e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2a65d78ced8d7cfbcbd2e414b52c90780bd6409e)
- [7726ef0ac3208c2f2d863b85c35df75d7a3f72d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/7726ef0ac3208c2f2d863b85c35df75d7a3f72d2)
- [56b99ab34667650c0580f0f9c3c04719f901d1a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/56b99ab34667650c0580f0f9c3c04719f901d1a8)
- [97d0ec1b4987dad9c74088783dc99b1ae8ccf5b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/97d0ec1b4987dad9c74088783dc99b1ae8ccf5b4)
- [82f6a3d1e2d04ba81abf9d54535040ba584b4989](https://github.com/Cognis-Labs-HQ/Cognis/commit/82f6a3d1e2d04ba81abf9d54535040ba584b4989)
- [2bdeeebb415c9b3db7a1788cc730883eb6bd5a30](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bdeeebb415c9b3db7a1788cc730883eb6bd5a30)
