# 安定したモジュールナビゲーション

**機能ブランチ:** feature-review-pr-for-double-loading-issue

## SPA ナビゲーション中の再マウントを解消

モジュールページで、直接ページ読み込み用の共通マウントガードを使用するようにしました。ダッシュボードルーター経由の読み込みで二重マウントが発生せず、ナビゲーションコンポーネントの重複や後続の SPA ナビゲーションの不具合を防ぎます。

## ナビゲーション中のページスタイルを分離

ダッシュボードルーターは、直接読み込みされたページが所有するスタイルを識別し、移動先をマウントする前に前のページのスタイルを削除します。Meetings から Messages へ移動した際に会議固有のボタンルールが残り、ページコンポーザーのサイドバーを崩すことを防ぎます。

## ナビゲーション操作をスタイル適用後に表示

Messages は CSS インポートの連鎖に依存せず、各会話スタイルシートをマウント前に読み込むようになりました。これにより、会話アバターがスタイル未適用の大きさで一瞬表示されることを防ぎます。通知プラグインも、スタイルシートの読み込み後にナビゲーションバーへベルを追加します。

## コミット

- [4506d46](https://github.com/Cognis-Labs-HQ/Cognis/commit/4506d46a613a8bb643d65a4ca5e6e0821c5f43fb)
- [63976d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/63976d1f112ff39eed1565d36fed8ae0500ad51b)
- [14c1e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/14c1e2fcb3904d92709a38a8cb13ca8fe7ed2a10)
- [e6fbb62](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6fbb62939f204ab29eec66842a1705ff26c7800)
- [77207d0](https://github.com/Cognis-Labs-HQ/Cognis/commit/77207d05b3bf404ecfccf24ed4a9a4c8a6319ffb)
- [5ccdca8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ccdca846f9696e63dbe7b0871c110d5fd7c5d51)
- [609c964](https://github.com/Cognis-Labs-HQ/Cognis/commit/609c9640c24cbbf5d66703fbe41832cf2c9ba962)
- [035ad2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/035ad2ad52ee11911478e758e9138d78dcd581a3)
