# 言語ドロップの安定化

**機能ブランチ:** feature-language-dropzones

## 移動先と操作の後処理

言語の移動と並べ替えで、移動先を正しく判定する通常のドラッグとタッチ・ペン操作を共有します。中断や表の外へのドロップは下書きを変更せず、再描画時に古い操作を解除します。言語コード、英語の代替表示、オフライン制限は維持します。

## 明示的な下書き保存

保存と破棄が引き続き永続化を管理します。表示言語の選択は学習言語の登録とは別です。既存の言語チュートリアルと文書でハンドル操作と保存手順を説明します。

## 有効期間内での操作完了

ジェスチャー処理は設定画面内で管理します。操作可否のエラーはキャプチャと表示を解除してから報告します。キャンセル、コントローラーの置換、移動元・移動先の行の変更後には、キャプチャ解除時のドロップを適用しません。

## コミット

- [2b6ad23f49f98b4f95bd20f181ec466b3570db08](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b6ad23f49f98b4f95bd20f181ec466b3570db08)
- [85357d454fe9764420041bbae79fdd90e7c41e8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/85357d454fe9764420041bbae79fdd90e7c41e8a)
- [35d228e89a9aa570394cf705316603289151f1a0](https://github.com/Cognis-Labs-HQ/Cognis/commit/35d228e89a9aa570394cf705316603289151f1a0)
- [f9231768763f09bc7b219d27654b0e5f66fd7d0c](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9231768763f09bc7b219d27654b0e5f66fd7d0c)
- [b50fa257701a11c469247b9d060548d344594486](https://github.com/Cognis-Labs-HQ/Cognis/commit/b50fa257701a11c469247b9d060548d344594486)
- [83e3a243135fd0e0bae661d8a59aa6a0ff4ed3be](https://github.com/Cognis-Labs-HQ/Cognis/commit/83e3a243135fd0e0bae661d8a59aa6a0ff4ed3be)
