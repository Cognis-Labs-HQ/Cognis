# SAML SSO認証アダプター

## 概要

SAMLアダプターは、外部アイデンティティプロバイダーからのSAML 2.0アサーションを通じてユーザーを認証し、Microsoft AD FS、Google Workspace、Okta、またはその他のSAML 2.0準拠のIdPとのエンタープライズシングルサインオンを可能にします。

## 責務

- SAML レスポンス/アサーションを受け入れ、設定された `SamlClient` で検証し、アイデンティティクレームを抽出する。
- 設定可能なSAML属性をCognisの `isAdmin` フラグにマッピングする。
- 認証ゲートウェイ向けに `AuthProviderAdapter` インターフェースを公開する。

## アーキテクチャ

```ts
export interface SamlClient {
    validateAssertion(samlResponse: string): Promise<SamlAssertion | null>;
}
```

## 設定

`PUT /api/v1/gateways/auth/adapters/saml/config`（管理者のみ）で設定します。

| キー             | 説明                               | 必須   |
| ---------------- | ---------------------------------- | ------ |
| `entryPoint`     | SAML IdP SSO URL                   | はい   |
| `issuer`         | サービスプロバイダーエンティティID | はい   |
| `certificate`    | IdP X.509署名証明書（PEM形式）     | はい   |
| `adminAttribute` | 管理者チェック用のSAML属性名       | いいえ |
| `adminValue`     | 管理者アクセスを付与する属性値     | いいえ |
