# 正しい依存関係 UUID

**機能ブランチ:** work

## コンポーネント依存関係を正しく解決

Registration はゲートウェイ依存関係のみを宣言するようになり、起動時の警告が解消されました。Social Messages アダプターは、インストール済みの Social Profile アダプターの UUID を参照するようになりました。

## 依存関係の検証で回帰を防止

アーキテクチャ検査は、インストール済みコンポーネントを示さない依存関係 UUID と、ゲートウェイ依存関係リスト内のアダプター UUID を拒否するようになりました。

## コミット

- [6fa7e14](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fa7e1466a06e62c23cf4905d680fa3aa1bf7768)
