# 外部プロフィールの強化

**機能ブランチ:** feature-implement-sso-user-profile-enhancements

## 安定した外部アカウント

外部 ID は、登録、永続化、トークン発行、プロフィール作成の前に、単一の正規化されたプロバイダー別ローカルアカウントへ解決されます。解決済みハンドルにより、`x:firehawksystems`、`line:firehawksystems`、ローカルの `firehawksystems` は別々のアカウントとして保持されます。

## 安全な ID ライフサイクル

外部アカウントを削除すると、アカウントデータを削除する前に一方向の ID フィンガープリントが保存されます。その後プロバイダー認証に成功すると、プロバイダー別アカウントの再作成時に削除記録をトランザクション内で消去できますが、認証失敗や登録確定失敗では削除状態を変更できません。

## プロバイダープロフィール体験

管理画面には外部アカウントの解決済みハンドルとプロバイダーアイコンが表示されます。ユーザーはプロフィールバナーからプロバイダープロフィールの更新を要求でき、Cognis は返されたプロフィールメディアを保存してリモート画像の反復取得を避けます。

## プロバイダー指定の公開範囲

外部認証セッションと解決済みプロフィールは `profileVisibility` を返せます。Cognis は対応する値を検証し、プロフィールの作成または同期後に指定された公開範囲を保存します。

## 明確なモジュール設定

モジュールはアダプター対象を含むローカライズ済みの有効化ガイダンスを宣言できます。有効化後、Cognis はプロバイダーに依存しない次の手順を表示し、管理者を関連する管理領域へ直接案内できます。

## 改善された登録設定

管理画面では登録と招待のポリシーを簡潔な「はい」または「いいえ」のラジオグループで表示します。共通フォームコンポーザーと変更追跡が保存と破棄を一貫して管理し、必須ラジオグループは選択されるまで無効です。

## 準拠と安全性

アカウント名前空間は検索前に検証され、失敗したアカウント作成のロールバックは削除記録を作成せず、プロフィール同期には破壊的操作のスタイルを使用し、影響を受けるコンポーネントのバージョンと依存関係上限を整合させています。

## コミット

- [e852d7df7c3eef240000095422fafdad6d716042](https://github.com/Cognis-Labs-HQ/Cognis/commit/e852d7df7c3eef240000095422fafdad6d716042)
- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
- [3691212d5088e503900b8a9f3aab8c6c1f375840](https://github.com/Cognis-Labs-HQ/Cognis/commit/3691212d5088e503900b8a9f3aab8c6c1f375840)
- [72389da57f5713401c14521893e8f0f1c540cfc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/72389da57f5713401c14521893e8f0f1c540cfc7)
- [bbc6a9937ec55eb7959d2f788976bee62c222a86](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbc6a9937ec55eb7959d2f788976bee62c222a86)
- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
- [d758074ac7dae7bfaaebf4dfd956096a6679e566](https://github.com/Cognis-Labs-HQ/Cognis/commit/d758074ac7dae7bfaaebf4dfd956096a6679e566)
- [6e3830656f89213880dbcb4429ff44239f2c2bbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
- [b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4)
- [fbbbfda628ce7aed65235b1b071b921c906dd79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbbbfda628ce7aed65235b1b071b921c906dd79d)
