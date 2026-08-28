# より安全な DOM パーキング

**Feature Branch:** feature-add-opt-in-flag-for-dom-parking

## DOM パーキングをオプトイン化

page composer は既定でページ内容を再構築するようになり、退避された DOM がユーザーの更新データを隠すことを防ぎます。状態を持つメディアが必要なページだけ明示的に有効化できます。

## Jitsi Meet のアクティブセッションを維持

埋め込み Jitsi Meet ページでは完全な DOM パーキングを有効にし、状態を持つ iframe が再接続せずに composer のレイアウト更新を乗り越えられるようにしました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/44d57a98837df3d5ed38f8bd17413fa3e2a32904
