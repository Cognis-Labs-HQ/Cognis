# CLI 招待の配信

**機能ブランチ:** feature-cli-invite-integration

## メールなしでトークンを生成

登録トークンのコマンドは、現在の登録 API 契約に従って手動配信を要求します。メールアドレスの引数を取らず、メールを送信せずに登録リンクを返します。招待メールのコマンドはメール配信を明示的に要求します。既存の認可とドメイン制限は引き続き適用されます。

## コマンドの結果を検証

実際のルートを使うテストで、匿名およびメールアドレスに紐づく発行、不正な入力、認可エラー、ドメイン制限、ログにリンクを漏らさない意図的なリンク出力を確認します。CLI 0.4.3 には登録トークンアダプター 0.1.42 が含まれます。返されたリンクは秘密です。要約でリンクが省略された場合は詳細出力を使用してください。

## コミット

- [4b8d1785cf568c361b88e0eb43709e268ffd26a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/4b8d1785cf568c361b88e0eb43709e268ffd26a6)
- [67c4b5ab64feb16d7e5afc1a9aa47b508690861d](https://github.com/Cognis-Labs-HQ/Cognis/commit/67c4b5ab64feb16d7e5afc1a9aa47b508690861d)
- [bc15ea040864c918c3c39840ff519cc094f144e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc15ea040864c918c3c39840ff519cc094f144e1)
