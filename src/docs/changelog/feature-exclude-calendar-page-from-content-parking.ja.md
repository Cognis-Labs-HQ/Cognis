# カレンダー移動

**Feature Branch:** feature-exclude-calendar-page-from-content-parking

## カレンダーの駐車無効化

カレンダーページではページコンポーザーのコンテンツ駐車を無効化し、表示切り替え時に有効な操作部品を再構築してナビゲーションが反応し続けるようにしました。終日予定の日付入力も、日時モードから日付モードへ切り替える前に空にすることで、カレンダー更新中にブラウザーの形式警告が繰り返されないようにしました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7fb2febaef7ef70015718991ca75414b5d0cf2df
