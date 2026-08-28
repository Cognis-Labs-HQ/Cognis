# 通知ボックスが空のときに「すべて削除」操作を無効化

## 概要

内部通知の受信ボックスで通知が 0 件の場合、破壊的な「すべて削除」ボタンを無効化するようになりました。これにより不要な確認ポップアップを防ぎ、操作状態を受信ボックスの内容と一致させます。

## 変更されたファイル・コンポーネント

- `src/adapters/notify/internal/ui/navbar-plugin.js` — 受信ボックスが空のときに「すべて削除」ボタンを無効のまま維持し、通知がない場合はクリック経路で確認ポップアップを開かないようにガードを追加。
- `src/adapters/notify/internal/ui/notifications.css` — 「すべて削除」ボタンが無効な間は破壊的なホバー表示にならないよう調整。
- `src/ui/tests/notification-followups.test.js` — 空の受信ボックス状態をレンダリングしたランタイム検証を追加し、「すべて削除」クリック経路でポップアップが呼ばれないことを確認。
- `src/adapters/notify/internal/package.json` と `src/docs/versions.en.md` — Internal Notification アダプターのバージョンを `0.5.3` に更新。

## コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/96d6616
