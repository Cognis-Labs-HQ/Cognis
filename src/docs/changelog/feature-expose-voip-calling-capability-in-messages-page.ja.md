# Messages のビデオ通話基盤

**機能ブランチ:** feature-expose-voip-calling-capability-in-messages-page

## プロバイダーに依存しないチャット通話アクション

ブラウザー VoIP プロバイダーが利用可能な場合、ダイレクトチャットとグループチャットにアクセシブルなビデオカメラ操作が表示されるようになりました。この操作は Messages を Jitsi に結合せず、段階化された ctx フローを通じてルームの全メンバー情報とピクチャーインピクチャー表示要求を渡します。

## モジュール VoIP を Messages より先に読み込み

外部モジュールは、登録したナビゲーションプラグインでブラウザーケイパビリティを宣言できるようになりました。Cognis はこれらのスクリプトをケイパビリティプロバイダーの検出対象に含めるため、Messages が利用可否を確認してビデオカメラ操作を描画する前に、Jitsi が `voip:startCall` を提供できます。

## ルーム単位の VoIP アクション

Messages はルームごとにプロバイダーへアクションを問い合わせるようになりました。プロバイダーは通話を非表示にするか、ミーティングコンテキストを含むホスト管理のコンポーネントウィンドウを要求するか、既存のミーティングへ移動できます。一時コンポーネントステージは終了後に削除され、起動失敗はチャットの高さを変えずにログとトーストで通知されます。

## インライン通話を PiP へ自然に移動

通話コンポーネントは、ミーティングのホワイトボードと同じ埋め込みコンポーネントウィンドウ方式で、スレッドヘッダー領域とメッセージ一覧の間に開くようになりました。左上の戻る操作で通話をピクチャーインピクチャーへ移動し、通常の Messages レイアウトを復元して、終了後に古いステージを残しません。

## Meetings の移動後もボタン表示を維持

共通のアクション種別ボタンスタイルを専用の再利用可能なスタイルシートへ移し、ダッシュボードシェルで常に保持するようにしました。Meetings から移動するとルート固有のスタイルだけが解除されるため、どの移動先ページでもサイドメニューや操作の中立ボタンに枠線、色、ホバー状態、無効状態が維持されます。

## SPA の解除後にバージョン付き CSS を再読込

SPA スタイルシートの準備状態を、バージョン付き URL 全体ではなく正規化したパスで管理するようにしました。Meetings からの移動時にルート CSS が削除されても、後続ページは古い解決済み Promise を再利用せず、同じバージョン付き Page Builder スタイルシートを再読み込みして完全な表示を保ちます。

## コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
- https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b62797540e433c07ee81751a58e327085f01739
