# データベース型契約

**機能ブランチ:** feature-database-type-contracts

## 型付きデータベース境界

データベース初期化は、実際に使用する生の実行機能のみを要求します。公開アプリケーションの実行インターフェースは構造化コマンドを維持し、アダプターのトランザクションは生の実行型を保持します。列の宣言には既存の任意の名前変更元を含めます。PostgreSQL はドライバーの行数が null の場合にゼロを返し、行と数値の件数は保持します。MariaDB は条件を正規化する前にコマンドの種類を絞り込みます。アダプターのテストは汎用クエリーの型とコンポーネント所有のデータセットを使用します。

## コミット

- [0860c74b81eb91404ff15cc0ce4a765bc1ad3413](https://github.com/Cognis-Labs-HQ/Cognis/commit/0860c74b81eb91404ff15cc0ce4a765bc1ad3413)
- [358fe1e04b4e6ac672c64aaa2f1d687db91f38c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/358fe1e04b4e6ac672c64aaa2f1d687db91f38c9)
