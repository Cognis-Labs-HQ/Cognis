# 技術リファレンス

公開登録 の公開インターフェースと運用規則を説明します。

## インターフェース

登録のゲートウェイに `register` プロバイダーを提供します。`username` と `password`、任意の `email` と `displayName` を受け付けます。独立した HTTP ルートはありません。

## 設定

招待トークンなしのアカウント作成を許可する場合に限り、登録の管理画面で公開登録を有効にしてください。

## 動作

ユーザー名と表示名の余分な空白を除去し、ユーザー名とパスワードを必須とします。`user` 権限のローカルアカウントを作成し、提供されていればプロフィール作成処理を呼び出します。

アダプターはusername、password、任意のemailとdisplayNameを受け取ります。usernameとdisplayNameの前後の空白を除き、空のユーザー名またはパスワードをusername_and_password_requiredで拒否し、userロールでアカウントストアを呼び出します。戻り値にはusername、enabled、roleが含まれます。永続化はアカウントストアが担当し、失敗は呼び出し側に伝播します。createProfileが提供されていれば、アカウント作成後にプロフィール作成の完了を待ちます。アダプターは初期状態では無効で、ゲートウェイが公開登録ポリシーを確認し、無効な登録を拒否します。任意のメールアドレスは入力契約の一部ですが、アカウント登録操作には渡されません。

## セキュリティ

このプロバイダーから管理者の権限を要求することはできません。登録ポリシーと外部認証の継続処理は、担当のゲートウェイが確認します。

## リファレンス

- [src/adapters/registration/public/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/manifest.json)
- [src/adapters/registration/public/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/package.json)
- [src/adapters/registration/public/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/registration/public/index.ts)
