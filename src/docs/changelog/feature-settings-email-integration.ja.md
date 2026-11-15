# 設定のメール操作

**機能ブランチ:** feature-settings-email-integration

## 変更の重複を防止

「主に設定」と「削除」は適切な操作表示を使い、処理中のロックを共有します。ページを離れた場合やアカウント、プロバイダーが変わった場合は古い完了通知を表示しません。

## 結果と復旧方法を明示

翻訳済みの通知で確認済み、送信待ち、拒否、未確認の変更を区別します。「更新」は変更を繰り返さずに確実な状態を読み取り、送信待ちの変更は従来の予測一覧を維持します。一般チュートリアルで復旧方法を説明します。未確認の結果は現在のページだけで管理し、設定を開き直しても完了した証明にはなりません。

## コミット

- [ae0cbf0ff0c5da35e2ce830eb2a21f51664f6d73](https://github.com/Cognis-Labs-HQ/Cognis/commit/ae0cbf0ff0c5da35e2ce830eb2a21f51664f6d73)
- [bdad45a8713f4a686e7fff9ea3c53151048fcd15](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdad45a8713f4a686e7fff9ea3c53151048fcd15)
- [4bc883af3469608bd179a04497e14e99c996223e](https://github.com/Cognis-Labs-HQ/Cognis/commit/4bc883af3469608bd179a04497e14e99c996223e)
- [34dc81b59c40e5e0cb443157f748f74a9e2badaa](https://github.com/Cognis-Labs-HQ/Cognis/commit/34dc81b59c40e5e0cb443157f748f74a9e2badaa)
