# 拡張可能なライブラリエントリポップアップ

**機能ブランチ:** feature-refactor-app.js-for-popup-implementation

## ルート連動のエントリ詳細

ライブラリエントリは、利用可能なメタデータ、関連情報、前後ナビゲーションを備え、履歴と連動する簡潔なポップアップで開きます。Study ナビゲーションにはユーザーメニューと同じボタンスタイルを適用します。

## 拡張可能な詳細構成

詳細フローを UI プロバイダーの読み込み前に宣言し、コア前、コア、コア後の順序、削除可能なフック、提供されたポップアップアクションの実行を保証します。

## 信頼性の高いページライフサイクル

直接読み込みと SPA 遷移は標準の認証済みページコンポーザーライフサイクルを使用し、Study サブメニューを維持します。

## コミット

- [f25e2f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f25e2f649aadef46a713e85d70d627370f60ba5c)
- [160cbba5](https://github.com/Cognis-Labs-HQ/Cognis/commit/160cbba5e9344f11c429f4c8f8ae2ba4ceda468b)
