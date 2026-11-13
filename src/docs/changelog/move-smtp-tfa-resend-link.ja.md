# SMTP TFA 再送信と制限表示

**機能ブランチ:** copilot/move-smtp-tfa-resend-link

## 概要

SMTP 二要素認証画面の「メールコードを再送信」リンクが、アクション領域に
インラインで表示されるのではなく、コード入力欄の直下に独立した行で
表示されるようになりました。

SMTP 送信レート制限を追跡するカウントダウンが正しく復元されるようになりました。
レート制限状態が検出された時点、初回チャレンジ時またはリトライ失敗後、
直ちにカウントダウンが開始されます。

SMTP ベースのログインチャレンジは、確認メールが配送待ちキューに入った時点で
SMTP 配送完了を待たずに TFA プロンプトへ切り替わるようになりました。キューが
受信者レート制限の待機中でも、ログイン UI は直ちにカウントダウンを受け取り、
キュー送信が実行されるまで最後に有効だったコードをそのまま使えます。

ブラウザのビューポートがモバイルとデスクトップのレイアウト間で切り替わっても、
TFA 画面が維持されるようになりました。以前は TFA ステップ中にウィンドウ
サイズを変更すると、認証情報入力画面にリセットされていました。レイアウトの
再レンダリング後、アクティブな TFA プロンプトが自動的に復元されます。

SMTP ログインフローがコードを自動送信した場合、トーストは再送信クールダウンの
警告ではなく、コード送信完了を示す表示になりました。再送信リンクのカウントダウンは
そのまま残るため、現在のレート制限は引き続き分かります。

複数の TFA 方式が利用可能な場合、ページ読み込み時に SMTP コードが自動送信
されなくなりました。サーバーは設定済み方式がちょうど 1 つのときのみ
チャレンジを開始します。複数の方式がある場合、ユーザーが方式タブを明示的に
選択するまでチャレンジは開始されず、選択時にクライアントが resend エンドポイントを
通じてチャレンジを起動します。既存のチャレンジがアクティブな間は、
SMTP タブに再び切り替えてもコードは再送信されません。

## 変更されたファイル/コンポーネント

- `src/gateways/notify/gateway.ts`
- `src/gateways/notify/bootstrap.ts`
- `src/gateways/tfa/bootstrap.ts`
- `src/gateways/tfa/gateway.ts`
- `src/gateways/tfa/ui/login-flow.js`
- `src/gateways/tfa/ui/languages/*/strings.xml`
- `src/gateways/tfa/tests/login-flow-ui.test.js`
- `src/gateways/tfa/tests/tfa-gateway.test.ts`
- `src/gateways/tfa/manifest.json`
- `src/adapters/notify/smtp/smtp-notification-sender.ts`
- `src/adapters/tfa/smtp/index.ts`
- `src/gateways/notify/tests/notification-gateway.test.ts`
- `src/adapters/notify/smtp/tests/smtp-notification-sender.test.ts`
- `src/adapters/tfa/smtp/tests/smtp-adapter.test.ts`
- `src/docs/versions.en.md`

## コミット

- [460f399](https://github.com/Cognis-Labs-HQ/Cognis/commit/460f399ae3701867d002e0006d3a71a7dbf9e3c8)
