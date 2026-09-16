# より集中しやすいアカウント作成

**機能ブランチ:** feature-implement-form-composer-for-create-account

## アカウントフォーム全体を一貫して構成

「アカウントを作成」ページでは、共有フォームコンポーザーを通してアカウント作成フォーム全体を表示するようになりました。フィールド、検証フィードバック、文字数表示、操作が、ほかの Cognis フォームと一貫します。

## 招待情報を確認しやすく改善

招待の有効期限が、ライブ通知を行わないコンパクトなピルに表示されるようになりました。これにより、秒単位の更新がスクリーンリーダー利用者を繰り返し妨げません。また、紹介カードとフォームカードの高さが個別に調整されるため、長い作成フォームによって左側のカードが不要に高くなることがなくなりました。

## 公開ページからアカウント要求を送信しない

可用性と在席状況の報告は、Auth が所有するトークンストレージを直接読み取らず、Auth ゲートウェイの UI コンテキスト機能を通して認証状態を確認するようになりました。これにより、Social Profile を特定の認証プロバイダーへ結合せずに、公開認証ページからアカウント専用の Social API へ要求が送信されません。

## 必須フィールドの強調表示を維持

「アカウントを作成」フォームでは、登録画面やログイン画面のスタイルを上書きせず、フィールドの表示を共有フォームコンポーザーに全面的に委ねるようになりました。これにより、ライトテーマとダークテーマのどちらでも必須フィールドのアスタリスクが一貫して表示されます。

## コミット

- [74cb218](https://github.com/Cognis-Labs-HQ/Cognis/commit/74cb218dfafdfd93dcfef2ca2928ac6657ff5245)
- [9cc4ed9](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cc4ed9c285c77d2901d2ea4cadb35b66af6ddc6)
- [1690cdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/1690cdb58e8bcad63b60ef8beba367c3d0a03031)
- [a057317](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0573172b0549e663be0058f77b3af5aecc12432)
- [00fd542](https://github.com/Cognis-Labs-HQ/Cognis/commit/00fd5422)
