# 技術リファレンス

OpenID Connect の公開インターフェースと運用規則を説明します。

## インターフェース

authenticate(credentials) は `accessToken` を読み、注入した `OidcClient.introspect` を呼びます。`sub` で外部を識別し、`provider`、`externalUserId`、任意の `email`、`role` を返します。未接続や入力不足では null です。

## 設定

### 設定

`PUT /api/v1/gateways/auth/adapters/oidc/config`（管理者のみ）で設定します。

| キー           | 説明                                                   | 必須   |
| -------------- | ------------------------------------------------------ | ------ |
| `providerName` | プロバイダーの識別子                                   | はい   |
| `clientId`     | OAuth2クライアントID                                   | はい   |
| `clientSecret` | OAuth2クライアントシークレット                         | はい   |
| `discoveryUrl` | OpenID ConnectディスカバリドキュメントのURL            | はい   |
| `adminRoles`   | 管理者アクセスを付与するトークンロール（カンマ区切り） | いいえ |

設定ラベルは `stringsBaseUrl` を通じてこのアダプターの言語リソースから取得します。

`configure()` が適用するのは `providerName` / `adminRoles` です。他の接続項目はスキーマ情報であり、この実装はそこからクライアントを生成しません。

## 動作

同梱の OIDC アダプターには動作するプロトコルクライアントが接続されていません。createAdapter() はクライアントが null の状態を返し、setClient() による明示的な連携が必要です。設定だけではログインできません。

## セキュリティ

検証済みのクレームのみを識別に使います。外部の sub と adminRoles を確認し、アクセストークンや clientSecret をログに残さないでください。

## リファレンス

- [src/adapters/auth/oidc/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/oidc/manifest.json)
- [src/adapters/auth/oidc/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/oidc/package.json)
- [src/adapters/auth/oidc/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/oidc/index.ts)
