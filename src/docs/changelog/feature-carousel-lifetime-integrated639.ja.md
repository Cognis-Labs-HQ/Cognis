# カルーセル選択の有効期間

**機能ブランチ:** feature-carousel-lifetime-integrated639

## 終了した選択を変更しない

所有元が中止した後は、保留中のカルーセル有効化によって項目の識別子、ラベル、選択、アクセシビリティ状態、件数は変更されません。終了したコールバックは以前の所有元に通知せず、同じルート要素に新しくマウントされた選択を上書きしません。

## 既存のカルーセル操作を維持

有効な同期・非同期の有効化、false による選択拒否、選択順序と共通識別子による集約、追加操作、プレビューの解放は従来どおり動作します。既存の作成チュートリアルの対象と進行は変わりません。所有元のコールバック内部の処理は取り消さず、元にも戻しません。共有 UI には独立したコンポーネントバージョンはありません。

## コミット

- [7e9746dde4b5ce65f426e1baeef8b09bd814c0e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e9746dde4b5ce65f426e1baeef8b09bd814c0e0)
- [7adfa7602f9e74515dacf83ce779572bb8faffc3](https://github.com/Cognis-Labs-HQ/Cognis/commit/7adfa7602f9e74515dacf83ce779572bb8faffc3)
