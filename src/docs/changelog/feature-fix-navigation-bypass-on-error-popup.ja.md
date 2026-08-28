# エラーポップアップ移動

**機能ブランチ:** feature-fix-navigation-bypass-on-error-popup

## 読み込み後のクラッシュではページを維持

ランタイムエラーポップアップを閉じても、ボタンや読み込み後の操作でクラッシュする前に正常に読み込まれていたページから移動しなくなりました。ルートの読み込み失敗やマウント失敗では、必要に応じて引き続き前のルートへ戻ります。

## コミット

- [dfb83b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfb83b1d6e8faa104500cf75a9856c8c7a210511)
