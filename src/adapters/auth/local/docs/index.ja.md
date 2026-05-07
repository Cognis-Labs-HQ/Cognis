# ローカル認証アダプター

## 概要

ローカル認証アダプターは、Cognisの組み込みの認証情報ストアです。外部のアイデンティティプロバイダーを必要とせず、プラットフォーム自身のデータベースでユーザー名とハッシュ化されたパスワードを管理します。ローカルアダプターは常に有効で、無効にすることはできません。

## 責務

- `crypto.scrypt` を使用してローカル管理の認証情報を保存・検証する。
- アカウント作成に使用される `register()` を提供する。
- 最終ログイン時刻のトラッキング用に `updateLastLogin()` を提供する。
- `LocalAccountStore` 実装として `DbLocalAccountStore` を提供する。

## アーキテクチャ

`src/adapters/auth/local/store.ts` の `DbLocalAccountStore` がローカルユーザーアカウントの唯一の永続化レイヤーです。

### パスワードハッシュ化

パスワードはNode.jsの `crypto.scrypt` と16バイトのランダムソルトを使用してハッシュ化されます。保存形式:

```
scrypt:<hex-salt>:<hex-derived-key>
```

### CLI管理

ローカルアカウントは `user:*` コマンドnamespaceを使用して `cognisctl` CLIで管理します:

| コマンド | 説明 |
| ------- | ---- |
| `user:create` | 新しいローカルアカウントを作成 |
| `user:role` | アカウントにロールを割り当て |
| `user:set-password` | アカウントのパスワードを変更 |
| `user:disable` | アカウントを無効化 |
| `user:enable` | 無効化されたアカウントを再有効化 |
| `user:delete` | アカウントを削除 |

## 設定

設定可能なフィールドなし。認証情報の管理は `user:*` CLIコマンドまたは登録/ログインAPIルートを通じてのみ行います。
