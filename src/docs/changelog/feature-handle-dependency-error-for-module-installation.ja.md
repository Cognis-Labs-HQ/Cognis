# モジュール依存関係トースト

**機能ブランチ:** feature-handle-dependency-error-for-module-installation

## 明確な依存関係エラー

モジュールのインストールと有効化で、無効または利用できない必須依存関係が、ローカライズされたエラートーストとして表示されるようになりました。依存関係の内部詳細はサーバーログにのみ記録されます。

## スタイル付きプロバイダーボタン

認証プロバイダーは、必須の同一オリジンアイコンと完全にローカライズされたラベルを備えた、削除可能なブランド固有のログインボタンを登録できます。Cognis は表示契約を検証し、スタイルのない SSO 方式を除外して、小さい画面と大きい画面の両方でアイコンと全幅ラベルを表示します。認証フッターのリンクは、コンテンツ幅の 1 行にまとまって表示されます。

## SSO 認可フロー

ブランド固有のプロバイダーボタンは、ユーザー名とパスワードのフォームを送信せず、標準の `startSsoLogin` フローを開始するようになりました。プロバイダーのフックがプロバイダーを検証し、安全な相対 URL または HTTPS の認可リダイレクトを返します。失敗はログに記録され、ローカライズされたトーストで表示されます。

## トークン保護された作成

外部認証は、Cognis が新しいアカウントを保存する前に、必須の `gateAccountCreation` フローを通過するようになりました。公開登録は作成を直接許可し、非公開登録ではプロバイダーのメールアドレスと一致する使い捨てトークンを要求します。SSO UI で不足しているメールアドレスの入力が必要な場合も通知します。統合された登録トークンアダプターは招待トークンと SSO 認可トークンを管理し、SMTP 配信に依存し、無効化できません。また、管理者と創設者向けのユーザーページの招待操作にも使用されます。

## 匿名 SSO エラーの確実な処理

匿名ログインページでログイン方法の読み込みや SSO 開始に失敗しても、認証が必要なサーバーログエンドポイントを呼び出さなくなりました。2 回目の HTTP 401 要求や未処理のログ拒否を発生させず、元のローカライズされたログインエラーを表示し続けます。

## 組み合わせ可能な SSO 開始フック

SSO リダイレクトの解決時に、意図的に結果を返さないフローフックを無視するようになりました。これにより、無関係な `initiateAuthorization` 参加者が SSO 要求を監視または辞退しても、選択されたプロバイダーが認可 URL を返す前にリダイレクト選択が停止しません。

## トランザクション安全な登録認可

非公開登録の SSO は、アカウント作成前に招待を検証し、アカウントの保存成功後にのみトークンを消費して正規の検証済みメールアドレスを記録するようになりました。確定に失敗すると新しいアカウントを削除し、トークンを再利用可能に戻します。不正なトークンは通常のゲート拒否になります。再招待では新しいメールが届くまで以前の有効なトークンを保持し、ログインボタンの表示は既存のプロバイダー動作を上書きせず補完します。

## コミット

- [82b2e35e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82b2e35e792e91be2924edc0ffa45d3d2c8a1c0d)
- [d6a4f6b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6a4f6b5d0c4ae212927fd18912345ba749f837f)
- [4eb78e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb78e4433e7371533c1cd9d26bdca0e82f006f9)
- [5bd254bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bd254bb88a817bfe40e86eb32d25d53661ce5eb)
- [83ca6396](https://github.com/Cognis-Labs-HQ/Cognis/commit/83ca639667ff46fb7a66afeaa69b4145383a9da9)
- [88985bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/88985bd515cdbc7539c2326812879e67a39a1143)
- [4120a69d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4120a69d267eaf07897bed979032b2e7706e1a7c)
- [a4c928d8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a4c928d82c7c42ee4a9ec4f295199d008abc9137)
- [fa24bfec](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa24bfec261a358e17e6bbb9078b160a1b4cb903)
- [e66d75f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/e66d75f72b2e8ab4da4a4e93435f6472b4fe3903)
