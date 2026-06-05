# Gateway と Module の API 分離

## Gateway ルート接頭辞の統一

すべての Gateway は、専用の `/api/v1/<gateway-id>/` 接頭辞の下で API ルートを所有するようになりました。この規則に合っていなかったルートは改名され、notify Gateway のルートは `/api/v1/notifications/` から `/api/v1/notify/` へ、social Gateway のルートは `/api/v1/profile/` や `/api/v1/messages/` などから `/api/v1/social/` へ移動しました。

## 無効な Gateway は接頭辞配下を全面的に遮断

Gateway が無効な場合、その Gateway が所有する接頭辞配下のすべての HTTP リクエストは、404 にフォールスルーせず、`gateway_disabled` を含む 503 レスポンスを返すようになりました。

## 無効な Module は module_disabled を返却

Module が無効な場合、その Module が登録したルートへのリクエストは、404 にフォールスルーせず、`module_disabled` を含む 503 レスポンスを返すようになりました。
