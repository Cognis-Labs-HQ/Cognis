# 削除済み外部アカウントの再作成

**機能ブランチ:** recreate-deleted-external-identities

## 認証成功後の復元

認証に成功した外部 ID は、削除されたプロバイダー別アカウントを再作成できるようになりました。Cognis はアカウントを復元する同じトランザクション内で削除記録を消去し、認証に失敗した場合は消去しません。

## コミット

- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
