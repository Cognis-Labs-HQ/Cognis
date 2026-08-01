# カレンダーゲートウェイ

## 共有の配信

Calendar は `ctx` のフローフックとケイパビリティを通じて Share ゲートウェイに機能を提供します。ユーザー受信者への配信では、受信者所有の共有カレンダーを作成し、汎用ナビゲーション URL と一度だけ表示するローカライズ済み成功フィードバックを返します。パスワードは Share が所有し、正規の共有識別子でキーリングから取得します。

## 公開共有レンダラー

Calendar はカレンダーリンク用の `mountScriptUrl` として `/static/gateways/calendar/ui/share-renderer.js` を提供します。Share は解決済みカレンダーペイロード、許可されたケイパビリティ、限定ゲストトークン、翻訳、終了シグナルを `mount(root, options)` に渡します。読み取り共有は予定を表示し、`calendar:write` 共有はゲストトークンを使って `/api/v1/calendar/shared/:calendarId/events` に新しい予定を送信できます。
