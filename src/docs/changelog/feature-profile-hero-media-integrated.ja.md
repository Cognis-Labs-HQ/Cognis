# プロフィール上部の画像を維持

**機能ブランチ:** feature-profile-hero-media-integrated

## 更新中も画像を維持

無関係な更新や一時的な読み込み失敗が起きても、アバターとバナーの画像要素を維持します。キーの変更、確定した不存在、アクセス拒否では該当画像を消去します。

## メディアの有効期間を管理

Profile 3.0.20 は非同期読み込み、アップロード、削除、ファイル選択を有効なルート、セッション、プロバイダーに限定します。不要になったオブジェクト URL を解放し、古い処理の完了が新しいプロフィールに影響することを防ぎます。既存のエディターとアバタープレビューの契約は維持されます。

## コミット

- [a1c92e7a120e13504ad560f6f83f1413c0bcd9df](https://github.com/Cognis-Labs-HQ/Cognis/commit/a1c92e7a120e13504ad560f6f83f1413c0bcd9df)
- [997978e1f38ac8d917af0284ec3359effea36f17](https://github.com/Cognis-Labs-HQ/Cognis/commit/997978e1f38ac8d917af0284ec3359effea36f17)
