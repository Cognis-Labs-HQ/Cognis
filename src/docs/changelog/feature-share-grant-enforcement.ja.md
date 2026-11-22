# 共有権限の厳格な適用

**機能ブランチ:** feature-share-grant-enforcement

## アクセス時に有効期限を確認

ユーザーへの直接共有は、有効期限を過ぎるとアクセスを許可しません。パスワードで解除済みで履歴に保持されている共有も対象です。有効期限が空の場合は無期限のままですが、空でない不正な値の場合はアクセスを拒否します。

## 明示的な権限取り消しを反映

`grantedCapabilities: []` を指定した PATCH は、付与済みの権限をすべて削除します。このフィールドを省略すると権限を保持し、空でない配列を指定すると置き換えます。受信者、パスワード、アダプターの確認は引き続き適用されます。

## コミット

- [37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359630d1cdc12910d11cfb9d20e2c916fbf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0a62926c095df90a4cd6c15f9484f287b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
