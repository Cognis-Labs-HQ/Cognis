# OIDC SSOアダプター

## 概要

OIDCアダプターは、OpenID Connectトークンイントロスペクションを通じてユーザーを認証し、Google、Microsoft Entra ID、Okta、またはセルフホストのKeycloakインスタンスなどのOAuth2/OIDC互換プロバイダーとのシングルサインオンを可能にします。

## 責務

- `accessToken` 認証情報を受け入れ、プロバイダーのディスカバリエンドポイントを使用してイントロスペクトする。
- トークンの `roles` クレームからCognisの `isAdmin` フラグへマッピングする。
- 認証ゲートウェイ向けに `AuthProviderAdapter` インターフェースを公開する。

## アーキテクチャ

```ts
export interface OidcClient {
    introspect(accessToken: string): Promise<OidcTokenClaims | null>;
}
```

## 設定

`PUT /api/v1/gateways/auth/adapters/oidc/config`（管理者のみ）で設定します。

| キー           | 説明                                                   | 必須   |
| -------------- | ------------------------------------------------------ | ------ |
| `providerName` | プロバイダーの識別子                                   | はい   |
| `clientId`     | OAuth2クライアントID                                   | はい   |
| `clientSecret` | OAuth2クライアントシークレット                         | はい   |
| `discoveryUrl` | OpenID ConnectディスカバリドキュメントのURL            | はい   |
| `adminRoles`   | 管理者アクセスを付与するトークンロール（カンマ区切り） | いいえ |
