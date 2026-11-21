# 共有権限の厳格な適用

**機能ブランチ:** feature-share-grant-enforcement

## アクセス時に有効期限を確認

ユーザーへの直接共有は、有効期限を過ぎるとアクセスを許可しません。パスワードで解除済みで履歴に保持されている共有も対象です。有効期限が空の場合は無期限のままですが、空でない不正な値の場合はアクセスを拒否します。

## 明示的な権限取り消しを反映

`grantedCapabilities: []` を指定した PATCH は、付与済みの権限をすべて削除します。このフィールドを省略すると権限を保持し、空でない配列を指定すると置き換えます。受信者、パスワード、アダプターの確認は引き続き適用されます。

## コミット

- [1f5c4f101876d150f9ee130a00297fbb266d4399](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f5c4f101876d150f9ee130a00297fbb266d4399)
- [bb1d6a4e69171f0abfe3792028a9137855224315](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb1d6a4e69171f0abfe3792028a9137855224315)
- [05885663480dbd75b40b8fa5b5ea29faeb156fed](https://github.com/Cognis-Labs-HQ/Cognis/commit/05885663480dbd75b40b8fa5b5ea29faeb156fed)
