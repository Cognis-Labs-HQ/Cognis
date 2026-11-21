# 標準のレイアウト操作

**機能ブランチ:** feature-composer-native646

## 標準のレイアウト操作

メインおよび入れ子のレイアウトパネルでは、完了、破棄、リセットに標準の `button type="button"` コントロールを使用します。これらの操作は、外側のフォームを送信したり画面を移動したりしません。レイアウトの送信中は既存の編集ロックで無効になり、送信に失敗すると明示的に再試行できるよう復元されます。完了は引き続き保存の確認後に編集を終了し、破棄は書き込みを行わずローカルの基準状態に戻し、リセットは既定のレイアウトを保存して編集を続けます。既存の操作クラスとワークスペースチュートリアルの対象 `#composer-edit-toggle` は変わりません。

## コミット

- [d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc](https://github.com/Cognis-Labs-HQ/Cognis/commit/d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc)
- [ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0)
- [2d77508cffcb4eb46900f76d4f4174dba1799f7c](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d77508cffcb4eb46900f76d4f4174dba1799f7c)
