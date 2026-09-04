# 新しいルーム検索をユーザーに限定

**機能ブランチ:** work

## ユーザー専用のルーム検索

Messages の「新しいルーム」選択画面は、共通検索ユーティリティへユーザーカテゴリとタイプフィルターを渡すようになりました。Jitsi Meet の絞り込み検索と同じパラメーターを使い、無関係な結果タイプを除外します。

## 応答性のある検索状態

検索可能な文字数に達したクエリを実行すると、最小文字数の案内を直ちに読み込み状態へ置き換えます。失敗またはタイムアウトした要求では、古い結果や応答しない案内を残さず、明示的なエラーを表示します。

## 同期された着信プロンプト

着信は Messages のスレッドヘッダー直上のバーに表示されます。応答と拒否は関連付けられた通知とチャット内プロンプトを同時に解決し、ユーザー単位の呼び出しリースによって複数タブや画面で着信音が重複するのを防ぎます。

## 表示される通話バーと通話に集中した PiP

着信状態で選択中のルームを更新し、通知を表示したままでもアクションバーがスレッドヘッダー直下に現れるようになりました。起動する VoIP コンポーネントには Jitsi Meet の `voipCall` コンテキストを明示し、PiP 画面からミーティングチャットを除外します。

## 安全な PiP 終了処理

PiP 中の VoIP 通話を閉じる際に元のポータル階層を検証し、ブラウザーが状態保持のアトミック移動を拒否した場合は安全にフォールバックします。未処理の `HierarchyRequestError` を発生させずにコンポーネントを終了できます。

## 全高を使うドッキング通話ステージ

ドッキングされたプロバイダー通話は、Messages ウィジェットカードの残りの高さをすべて使用します。通話中のスレッドをヘッダー行と通話ステージ行にまとめ、ステージ、コンポーネントホスト、コンポーネントウィンドウを利用可能なコンテンツ行全体へ伸ばします。

## 確実な呼び出し音の終了処理とピクチャーインピクチャーからの復帰

通話終了後に遅れて届いた呼び出しリース要求は、呼び出しなしの結果として正常に完了するようになりました。SPA ナビゲーション後にピクチャーインピクチャーから通話を閉じると、結果に適したスタイルの「Messages に戻る」「通話を終了」「キャンセル」が表示されます。Messages に戻ると通話ルームへ移動し、既存のプロバイダーコンポーネントを再マウントせずに復元します。

## 安定したピクチャーインピクチャー終了コントロール

ピクチャーインピクチャーの終了操作がステージのライフサイクルにアクティブな通話を保持するようになり、ナビゲーション後の `ReferenceError` を解消しました。終了コントロールは標準のフローティングウィンドウサイズに戻り、破壊的な操作を示す `btn-cancel` クラスを使用します。

## 冪等な退出と繰り返しのピクチャーインピクチャー保持

サーバーがすでに通話を終了した後にプロバイダーの終了処理が遅れても、エラーを報告しなくなりました。退出は冪等に成功し、クリーンアップは既知の通話利用不可競合を抑制します。Messages に戻った後で 2 回目にピクチャーインピクチャーへ移動しても、次の SPA ナビゲーション中に通話が保持されます。

## コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713
