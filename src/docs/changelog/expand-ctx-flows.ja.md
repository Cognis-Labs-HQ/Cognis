# PR変更履歴 — ctxフローの拡張

## 概要

`ctx`フローシステムが、ユーザープロビジョニング・メッセージ配信・
ミーティング作成の唯一の経路となりました。レガシーな直接ストアアクセスの
フォールバックはこれらのルートから削除されました。必要なフローが利用できない
場合、APIはオーケストレーションされていないコードパスへ無言でフォールバックする
代わりに503を返します。

すべてのセカンダリゲートウェイ（TFA、登録、スタディ、カレンダー、notify）が
`bootstrap-platform/register-flows`フックを登録するようになり、authゲートウェイが
存在する場合にブートストラップフローへ参加できます。各登録は`hasFlow`で保護されて
おり、独立したテスト環境では完全なゲートウェイスタックがなくても動作し続けます。

ソーシャルゲートウェイの`validate-message`フックが更新され、プレーンテキストの
`content`フィールドではなく、暗号化されたコンテンツフィールド（`ciphertext`と`iv`）
を検証するようになりました。これは実際のワイヤーフォーマットに一致します。

メッセージアダプターが`send-message`フローに`persist-message`と`fan-out`フックを
登録するようになりました。room-routesの送信ハンドラーはこのフローに完全に委譲し、
ステージ結果から保存されたメッセージを読み取ります。

Jitsi Meetモジュールがすべての MEETINGSフローカタログエントリを登録し、
`construct-meetings-ui/resolve-providers`と`create-meeting/validate-request`の
フックを追加するようになりました。

deprovision-userルートが`cleanup-dependencies`ステージ結果から
`revokedTokenCount`を読み取り、`authorize-request`ステージ結果を確認して
認可エラー（403）を処理するようになりました。

## 変更されたコンポーネントとファイル

- `src/api/routes/users/index.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/tfa/bootstrap/index.ts`
- `src/gateways/registration/bootstrap/index.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/study/bootstrap.ts`
- `src/gateways/calendar/bootstrap/index.ts`
- `src/modules/jitsi-meet/bootstrap.js`
- `src/adapters/social/messages/index.ts`
- `src/adapters/social/messages/routes/shared.ts`
- `src/adapters/social/messages/routes/room-routes.ts`
- `src/api/tests/users/user-routes.test.ts`
- `src/adapters/social/messages/tests/routes-notifications.test.ts`
