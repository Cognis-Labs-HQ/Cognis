# ランタイム状態修正

**Feature Branch:** feature-fix-missing-database-relations-error

## ゲートウェイ状態用のデータベーステーブルを追加

Cognis はデータベース初期化時に永続化されたゲートウェイ状態テーブルを作成し、ランタイム状態の復元で読み取る前にも存在を確認するようになりました。これにより、PostgreSQL の起動ログに `gateways` リレーションが存在しないというエラーが出なくなります。

## 登録招待は読み取り前にスキーマを初期化

登録招待アダプターは、招待の一覧表示、発行、取り消しの前にトークンテーブルの存在を保証するようになりました。新しいデータベースでも、管理画面の招待ページがテーブル不足エラーを起こさずに招待状態を読み取れます。

## Commits

- [e68cb5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e68cb5a51f989982b2cea69cb48496fffd9061ee)
