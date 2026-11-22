# Social の型付き契約

**機能ブランチ:** feature-social-files-type-contracts

## ストレージとルートの型

ソーシャルプロフィールのロールと公開範囲の型を保存済みレコードに合わせました。メッセージとプロフィールのルートでは認可チェックを維持し、コールバック、通知、データベースコマンドに明示的な契約を適用します。ゲストセッションを解決できない場合は、従来どおりゲストプロフィールを読む前に失敗します。

## 独立した契約テスト

プロフィールの永続化テストは、トランザクションを備えたコンポーネント所有の構造化データベース代替実装を使用します。ゲストと非メンバーによるメンバー管理の拒否を検証します。Files の ACL テストでは呼び出し元コンポーネントを明示し、名前空間の識別とアクセス規則は変更しません。

## コミット

- [2e913c2810feec19fb4c08ead1c01fd2335a046f](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e913c2810feec19fb4c08ead1c01fd2335a046f)
- [dc8cc7ab0a27286fbed63e53637c73a0ce5878d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc8cc7ab0a27286fbed63e53637c73a0ce5878d3)
- [103bf368dd7f8931da2681a838e01e2d9980a4c2](https://github.com/Cognis-Labs-HQ/Cognis/commit/103bf368dd7f8931da2681a838e01e2d9980a4c2)
