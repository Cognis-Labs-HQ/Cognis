# 壊れていたログイン要求の修正

## 概要

ソーシャルプロフィールアダプターが未導入、またはその
`account_profiles` テーブルが利用できない場合、ログイン要求が
汎用的な `400 Request failed` 応答で失敗していました。ローカル認証
アダプターの DB ストアが、認証時とアカウント一覧取得時にそのテーブルを
結合していたためです。本来、認証は auth 自身が所有するアカウントデータの
みに依存すべきです。

この変更では、ローカル認証ストアからプロフィールテーブルへの
クロスアダプター依存を削除し、auth テーブルだけが存在する環境でもログインが
成功するようにしました。さらに、認証 lookup が `account_profiles` を
結合しようとすると失敗する回帰テストも追加しています。

## 変更されたファイル / コンポーネント

- `src/adapters/auth/local/store.ts` — ローカル認証の資格情報検証と
  アカウント一覧から `account_profiles` 結合を削除
- `src/adapters/auth/local/tests/store.test.ts` — ソーシャルプロフィール
  テーブルなしの DB ベース認証に対する回帰テストを追加
- `src/adapters/auth/local/package.json` — Local Auth アダプターの
  バージョンを `0.2.3` に更新
- `src/docs/versions.en.md` — Local Auth アダプターのバージョン一覧を更新

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/9ecb747f64a13830eb0d108fcd11d6bd5c0aa838
