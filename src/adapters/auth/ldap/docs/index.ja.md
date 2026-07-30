# LDAP認証アダプター

## 概要

LDAPアダプターは、LDAPディレクトリサーバーに対してユーザーを認証します。Active Directory、OpenLDAP、または類似のディレクトリサービスですでにアイデンティティを管理している組織に適した選択肢です。ユーザーはLDAPアクセストークンでログインし、アダプターはサービスアカウントでディレクトリにバインドし、ユーザーを検索し、グループメンバーシップをCognisの管理者ロールにマッピングします。

## 責務

- `accessToken` 認証情報を受け入れ、LDAPサーバーに対して認証する。
- 認証されたユーザーのLDAPグループをCognisの `isAdmin` フラグにマッピングする。
- 認証ゲートウェイ向けに `AuthProviderAdapter` インターフェースを公開する。

## アーキテクチャ

`src/adapters/auth/ldap/index.ts` の `LdapAuthAdapter` が `AuthProviderAdapter` を実装します。

```ts
export interface LdapClient {
    authenticate(accessToken: string): Promise<LdapIdentity | null>;
}
```

## 設定

`PUT /api/v1/gateways/auth/adapters/ldap/config`（管理者のみ）で設定します。

| キー           | 説明                                             | 必須   |
| -------------- | ------------------------------------------------ | ------ |
| `host`         | LDAPサーバーのホスト名                           | はい   |
| `port`         | LDAPサーバーのポート                             | はい   |
| `bindDn`       | サービスアカウントのバインドDN                   | はい   |
| `bindPassword` | バインドDNのパスワード                           | はい   |
| `baseDn`       | ユーザー検索のベースDN                           | はい   |
| `adminGroups`  | 管理者ロールを受けるLDAPグループ（カンマ区切り） | いいえ |

## 接続テスト

アダプターのテストエンドポイントは、ディレクトリ検出の前に設定済みサービスアカウントのバインドを検証します。無効な LDAP 認証情報はバインド DN またはパスワードの拒否として報告し、通信と証明書の障害には個別の安全な診断を使用します。プロバイダーの詳細なエラーはサーバーログにのみ記録されます。
