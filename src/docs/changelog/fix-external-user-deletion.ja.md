# ユーザー削除の永続化

**機能ブランチ:** fix-external-user-deletion

## 外部ユーザーを確実に削除

外部認証ユーザーを削除すると、アカウントを削除する前に一方向の ID フィンガープリントが保存されるようになりました。認証とプロバイダー照合はそのフィンガープリントを拒否するため、有効なプロバイダーセッションが削除済みユーザーを暗黙に再作成することはありません。

## コミット

- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
