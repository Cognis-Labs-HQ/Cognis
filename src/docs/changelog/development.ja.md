# Gateway と Module の API 分離

**Feature Branch:** development

## Gateway ルート接頭辞の統一

すべての Gateway は、専用の `/api/v1/<gateway-id>/` 接頭辞の下で API ルートを所有するようになりました。この規則に合っていなかったルートは改名され、notify Gateway のルートは `/api/v1/notifications/` から `/api/v1/notify/` へ、social Gateway のルートは `/api/v1/profile/` や `/api/v1/messages/` などから `/api/v1/social/` へ移動しました。

## 無効な Gateway は接頭辞配下を全面的に遮断

Gateway が無効な場合、その Gateway が所有する接頭辞配下のすべての HTTP リクエストは、404 にフォールスルーせず、`gateway_disabled` を含む 503 レスポンスを返すようになりました。

## 無効な Module は module_disabled を返却

Module が無効な場合、その Module が登録したルートへのリクエストは、404 にフォールスルーせず、`module_disabled` を含む 503 レスポンスを返すようになりました。

# ログ記録カバレッジと無音例外処理の修正

## サーバーサイドのログ記録テストカバレッジを拡充

新しいテストケースとして、一致しないパスや非 GET メソッドに対してストリームルートが false を返すこと、ログファイルが存在しない場合に `snapshot_error` イベントを送信すること、ファイルサイズの減少によりログローテーションを検出して `reset` イベントを発行すること、時間単位の時間範囲フィルターが正しく動作することを検証します。さらに logger のユニットテストとして、JSON コンソール形式の出力、`writeConsoleLog` の stdout と stderr への正しい振り分け、意味のある値がない場合に `createLogEntry` が meta フィールドを省略することを検証する 3 件を追加しました。

## クラッシュポップアップとルーターの無音 catch ブロックを排除

`installRuntimeErrorHandlers` の 2 つの `catch(() => {})` ハンドラーは、ポップアップを開く際に発生したエラーを飲み込む代わりに警告を記録するようになりました。アプリルーターの `readAuthSetupRequirement` の catch ブロックは、捕捉したネットワークエラーを記録するようになりました。`loadStudyChildComponents` の言語別フェッチの catch は、空のフォールバックを返す前に言語コードとエラーを記録します。管理ログセクションの `startStream` の catch は接続エラーを記録し、不正な SSE イベントの catch はパースエラーを記録するようになり、無音で破棄されなくなりました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/c2dd07a630b453a51f9793ab2855ab96150b058c
