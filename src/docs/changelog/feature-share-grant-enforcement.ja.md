# 共有アクセスと翻訳

**機能ブランチ:** feature-share-grant-enforcement

## アクセス時に有効期限を確認

ユーザーへの直接共有は、有効期限を過ぎるとアクセスを許可しません。パスワードで解除済みで履歴に保持されている共有も対象です。有効期限が空の場合は無期限のままですが、空でない不正な値の場合はアクセスを拒否します。

## 明示的な権限取り消しを反映

`grantedCapabilities: []` を指定した PATCH は、付与済みの権限をすべて削除します。このフィールドを省略すると権限を保持し、空でない配列を指定すると置き換えます。受信者、パスワード、アダプターの確認は引き続き適用されます。

## 翻訳カタログ

キーリングカタログのXMLルートを実行時の形式に統一し、ゲスト共有URLで一時キーリングを作成するときの翻訳エラーを防ぎます。ルーム鍵の入力、リアクション、繰り返し予定の編集、メール操作、通知設定、SSO応答、管理画面の状態に不足していたラベルを4言語で用意します。カタログのルートとリテラル参照の検査で、他のコンポーネントでも同じ不足を防ぎます。

## コミット

- [37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359630d1cdc12910d11cfb9d20e2c916fbf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0a62926c095df90a4cd6c15f9484f287b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
- [1f9c347e1ba3f836f54add76ce83592d85513f3e](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f9c347e1ba3f836f54add76ce83592d85513f3e)
