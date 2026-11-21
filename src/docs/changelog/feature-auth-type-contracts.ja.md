# 認証の型契約

**機能ブランチ:** feature-auth-type-contracts

## 型付き認証境界

Auth と TFA の宣言は、既存のアカウントロール、外部識別情報、データベースコマンド、Cookie セッションの投影を表します。セッションタイムアウトの検証で受け入れる数値は変わりません。ログインの保証と一度だけ使用できる要素認証の試行も維持されます。

## 契約に忠実なコンポーネントテスト

認証フィクスチャは実際の構造化データベース契約と登録済みフローの段階を使用します。HTTP ルートのテストは定義されたリクエストメタデータを渡し、拒否、永続化、ライフサイクルの検証を維持します。全体の型検査には製品とテストの両方のファイルが含まれます。

## コミット

- [111678dc84dee7c6d9bfcfbe83583b4c68f19392](https://github.com/Cognis-Labs-HQ/Cognis/commit/111678dc84dee7c6d9bfcfbe83583b4c68f19392)
- [c4f6ddf9f21a744f7d9133292f614e98467d829f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c4f6ddf9f21a744f7d9133292f614e98467d829f)
- [be83c1b8857ed540915606f4477053f3f54b933a](https://github.com/Cognis-Labs-HQ/Cognis/commit/be83c1b8857ed540915606f4477053f3f54b933a)
