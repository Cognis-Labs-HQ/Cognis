# ダイアログ初期化失敗時の解除

**機能ブランチ:** feature-popup-opening-integrated638

## 開けなかったダイアログからページを解放

ダイアログの初期構築中に同期例外が発生すると、失敗したダイアログを削除し、フォーカス、イベントリスナー、タイマー、変更追跡、スクロールロックの利用権を解除してから元のエラーを返します。保留中の変更破棄確認も、失敗した所有元とともに中止します。画像プレビューも同じ共通の解除処理を使い、翻訳エラーは抑制しません。

## 既存の操作を維持

有効な親ダイアログと新しいダイアログは、それぞれの所有権を維持します。コールバック内で再度閉じたり中止したりしても、確定済みの結果は変えません。通常のアニメーション、必須ダイアログ、操作コールバック、変更確認、ページ切り替え、チュートリアルの対象、操作、再実行の契約は維持します。初期化は引き続き同期処理であり、返された Promise は待機しません。共通 UI に独立したパッケージバージョンはありません。

## コミット

- [d3cde8f4eb18f2b646fe2fdd9128513db9d5365d](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cde8f4eb18f2b646fe2fdd9128513db9d5365d)
- [c6f12076f510b9853f0a9a63a1777f4a1138cd48](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6f12076f510b9853f0a9a63a1777f4a1138cd48)
- [31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc](https://github.com/Cognis-Labs-HQ/Cognis/commit/31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc)
