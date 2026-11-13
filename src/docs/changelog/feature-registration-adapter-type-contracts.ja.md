# 型付きプロバイダー契約

**機能ブランチ:** feature-registration-adapter-type-contracts

## 型付きプロバイダー契約

登録は任意のメールアドレスを含む招待入力全体をプロバイダー契約を通じて渡します。公開登録にはアカウント登録操作が必要で、トークン登録にはアカウント検索と削除も必要です。LDAPはディレクトリと認証情報のテスト結果の型を公開し、サポートされるページ検索オプションを使用します。ローカルアカウントの詳細にはロールとプロバイダーが含まれます。TOTPは使用するPromiseベースのSVG QRレンダラーのみを宣言します。認証、招待の承認、TOTP検証のルールは変わりません。

## ドキュメントとテスト範囲

登録ドキュメントには公開機能の使用例と技術契約を含めます。トークンアダプターのテスト用フィクスチャーは、唯一の利用元であるテスト内に配置します。

## コミット

- [0a07f8f619aa74e0b49cbae0ebe6489c5a6b0f2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/0a07f8f619aa74e0b49cbae0ebe6489c5a6b0f2b)
- [4017b8fb74d855ef203f1588bdea7bea648e215d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4017b8fb74d855ef203f1588bdea7bea648e215d)
