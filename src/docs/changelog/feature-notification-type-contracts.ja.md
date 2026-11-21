# 型付き配信契約

**機能ブランチ:** feature-notification-type-contracts

## Notify 2.2.10

送信側のキュー参照は任意であり、Notify契約で型を定義します。起動処理はゲートウェイ所有のストアを直接読み込み、不完全なコンストラクターの型アサーションを使わずにメールと設定の操作を公開します。一斉通知の検証は、保存前に有効なロールと日時を返します。

## Internal 0.5.34

内部配信はctxを通じて構造化データベース実行機能を取得します。ログ契約は起動処理で対応している重要度を使用します。暗号化、受信箱の認可、常時有効な配信は変更しません。

## SMTP 0.5.3

SMTPキューの項目は配信と再試行を通じて必須の件名を保持します。TLS接続オプションは直接TLSとSTARTTLSの中止シグナルを受け取ります。証明書ポリシー、タイムアウト処理、接続の後始末は変更しません。

## コミット

- [21295f18697e07a687ee70f6e5b3f5166db50963](https://github.com/Cognis-Labs-HQ/Cognis/commit/21295f18697e07a687ee70f6e5b3f5166db50963)
- [88e31ce18fc9e0fb6a0f6ff7e3bb500e65d58770](https://github.com/Cognis-Labs-HQ/Cognis/commit/88e31ce18fc9e0fb6a0f6ff7e3bb500e65d58770)
- [26a5b1a0a4b1db40cbe00a526c003a54f98a38e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/26a5b1a0a4b1db40cbe00a526c003a54f98a38e0)
