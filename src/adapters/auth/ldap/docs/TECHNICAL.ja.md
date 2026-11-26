# 技術リファレンス

LDAP ログイン の公開インターフェースと運用規則を説明します。

## インターフェース

`LdapClient.authenticate(username, password, options)` は `LdapIdentity | null` を返します。username/password と任意の authSourceId からサーバーを選び、provider、externalUserId、email、displayName、role を返します。既定の実装は StandardLdapClient です。

## 設定

管理画面で `unify` と名前付きの `servers` を保存します。identifier、serverUrl、baseDn、bindDn、bindPassword、userAttribute、userFilter が必要です。検索範囲や groupFilter、memberOf、nestedMemberOf を指定し、roleMappings でグループを対応付けます。パスワード書き戻しには writebackEnabled と検索範囲が必要です。統合した接続先は接続失敗時に次のサーバーを試します。

## 動作

### 接続テスト

アダプターのテストエンドポイントは、ディレクトリ検出の前に設定済みサービスアカウントのバインドを検証します。無効な LDAP 認証情報はバインド DN またはパスワードの拒否として報告し、通信と証明書の障害には個別の安全な診断を使用します。プロバイダーの詳細なエラーはサーバーログにのみ記録されます。

保存済み LDAP アダプターは、各サーバー名にサーバー URL、ベース DN、バインド DN、バインドパスワード、ユーザー名属性、ユーザーフィルターが揃っている場合に有効化できます。入れ子の複数サーバー設定と伏せられたパスワードを正しく扱うため、準備状態はアダプター自身が判定します。

管理画面の有効化スライダーは、LDAP サーバーが少なくとも 1 台設定されるまで無効のままです。

ユーザー検証を完了すると、サーバーが保留中の設定に追加され、有効化をすぐに選択できます。この時点で有効化すると、保留中のサーバー一覧を保存してからアダプターを有効にします。未保存のサーバー設定を開始した後にセットアップを閉じる場合は、破棄の確認が必要です。

ユーザー認証を手動でテストする前に Enter キーを押す場合を含めて「設定を保存」を選択すると、同じ認証テストが自動的に実行されます。認証に失敗した場合、バインド項目を修正できるようセットアップは接続手順に戻ります。

設定済みの最後のサーバーを削除すると確認警告が表示され、確認後に LDAP アダプターが無効になります。接続テストは、LDAP 応答から特定された原因候補ごとに項目別の診断を返します。拒否されたバインド資格情報のような複数項目のエラーを 1 つの入力に絞らず、報告されたすべての項目をセットアップフォームで強調表示します。

セットアップ拡張機能のユーザー向け文言は、アダプターの言語リソースから取得されます。ユーザー認証、およびサーバーの作成や更新に成功すると、成功トーストで通知されます。

アダプターは `/static/adapters/auth/ldap/languages` を言語リソースのベースとして宣言します。管理画面はアダプターメタデータからこの URL を受け取り、セットアップポップアップを読み込む前に i18n インスタンスを拡張します。

LDAP 接続フォームと資格情報フォームは、アダプターのローカライズキーを共有フォームコンポーザーに直接渡します。必須の資格情報が揃っていない状態でユーザー認証を試すと、ローカライズされたエラートーストを表示し、最初の無効な項目にフォーカスします。

ソースの削除時には `reconcile-auth-sources` フローを実行し、削除されたソースに関連する全アカウントのセッションを失効します。ソース統合が無効な場合はユーザーアカウントを削除し、有効な場合は削除されたソースの識別情報のみを切り離して、別の設定済みソースが保持されたアカウントを認証・更新できるようにします。

「テストして検出」が成功すると、セットアップがフィルターとロール対応付けに進む前に、ローカライズされた成功トーストを表示します。

## セキュリティ

認証情報は設定済みの LDAP クライアントが検証します。管理者権限はグループ対応に従います。バインド情報と TLS 証明書を保護してください。

## リファレンス

- [src/adapters/auth/ldap/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/ldap/manifest.json)
- [src/adapters/auth/ldap/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/ldap/package.json)
- [src/adapters/auth/ldap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/ldap/index.ts)
