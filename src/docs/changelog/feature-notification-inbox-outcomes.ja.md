# 信頼できる通知受信トレイ

**機能ブランチ:** feature-notification-inbox-outcomes

## 確認済みの状態を維持

読み込み失敗時も確認済みの通知、検索結果、未読数を保持します。「再試行」は書き込みを再送せずに受信トレイを確認します。拒否、結果不明、変更確認済みで更新失敗の各状態を別のメッセージで通知します。

## 受信トレイの有効期間を遵守

内部通知 0.5.36 はアダプター所有のフローで内容、順序、既読状態を反映します。古い要求、削除された操作要素、アカウント変更、プロバイダー破棄によって新しい受信トレイが上書きされることを防ぎます。継続ポップアップの方針とワークスペースのチュートリアル対象は維持します。

## コミット

- [8258aae680b6049b091f6af88d87e7dd0cfdcf77](https://github.com/Cognis-Labs-HQ/Cognis/commit/8258aae680b6049b091f6af88d87e7dd0cfdcf77)
- [d88df86fe5c20571ba8134db71bbbeeecf9c1820](https://github.com/Cognis-Labs-HQ/Cognis/commit/d88df86fe5c20571ba8134db71bbbeeecf9c1820)
- [0dce5557f24f3f32f34286fff1af710389b5de5c](https://github.com/Cognis-Labs-HQ/Cognis/commit/0dce5557f24f3f32f34286fff1af710389b5de5c)
