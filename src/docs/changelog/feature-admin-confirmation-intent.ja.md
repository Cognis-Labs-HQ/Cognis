# 管理画面の確認操作

**機能ブランチ:** feature-admin-confirmation-intent

## 管理画面の確認操作

無効化の確認では、中立的なキャンセルを先に表示し、無効化を危険な操作として表示します。有効化は肯定的な操作のままです。キャンセル、閉じる、Escape ではコンポーネントの状態を変更しません。処理中に同じ操作を重複して開始できません。コンポーネント画面を離れた場合、管理ページが置き換わった場合、またはセッションが変わった場合は未送信の処理を中止します。送信済みの要求は取り消せません。要求が拒否された場合、依存する後続の変更を停止します。結果が不明な場合や、変更を受け付けた後の読み取りに失敗した場合は、管理画面を再読み込みして現在の状態を取得するまで該当の操作を無効にします。未保存のセクションを離れる確認では、留まるは中立的な操作、破棄して移動は危険な操作として表示し、後者だけが下書きを削除します。

コンポーネントの操作には、有効な識別子と明確な現在の状態が必要です。一覧の応答が不正な場合、無効化の処理を開始せず、受け付け済みの変更に対する操作も再び有効にしません。

個別操作がロックされたアダプターは引き続きゲートウェイが管理します。ゲートウェイの操作では、それらのアダプターへの個別の変更要求を送信せず、有効化の選択肢にも表示しません。

## コミット

- [cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a)
- [da2f1f42738a2b3d61fa73a9624fb670557382ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/da2f1f42738a2b3d61fa73a9624fb670557382ad)
- [40d08231edb4630d69d1178097a50b06f3f05fd9](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d08231edb4630d69d1178097a50b06f3f05fd9)
- [5be1992292d6d641d75805fe58a48c5555cc7940](https://github.com/Cognis-Labs-HQ/Cognis/commit/5be1992292d6d641d75805fe58a48c5555cc7940)
- [cc01b0af6c503b4e1b54b4e0cc040d22363d1c89](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc01b0af6c503b4e1b54b4e0cc040d22363d1c89)
- [a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae)
