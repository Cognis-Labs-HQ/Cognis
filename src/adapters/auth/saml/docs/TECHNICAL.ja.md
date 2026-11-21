# 技術リファレンス

SAML ログイン の公開インターフェースと運用規則を説明します。

## インターフェース

authenticate(credentials) は `assertion` を読み、注入した `SamlClient.consumeAssertion` を呼びます。`nameId` で外部を識別し、`provider`、`externalUserId`、任意の `email`、`role` を返します。未接続や入力不足では null です。

## 設定

### 設定

`PUT /api/v1/gateways/auth/adapters/saml/config`（管理者のみ）で設定します。

| キー             | 説明                               | 必須   |
| ---------------- | ---------------------------------- | ------ |
| `entryPoint`     | SAML IdP SSO URL                   | はい   |
| `issuer`         | サービスプロバイダーエンティティID | はい   |
| `certificate`    | IdP X.509署名証明書（PEM形式）     | はい   |
| `adminAttribute` | 管理者チェック用のSAML属性名       | いいえ |
| `adminValue`     | 管理者アクセスを付与する属性値     | いいえ |

設定ラベルは `stringsBaseUrl` を通じてこのアダプターの言語リソースから取得します。

`configure()` が適用するのは `adminAttribute` / `adminValue` です。他の接続項目はスキーマ情報であり、この実装はそこからクライアントを生成しません。

## 動作

同梱の SAML アダプターには動作するプロトコルクライアントが接続されていません。createAdapter() はクライアントが null の状態を返し、setClient() による明示的な連携が必要です。設定だけではログインできません。

## セキュリティ

認証はアサーション検証と信頼された署名証明書に依存します。管理者グループを慎重に設定し、未検証のアサーションでセッションを作成してはいけません。

## リファレンス

- [src/adapters/auth/saml/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/manifest.json)
- [src/adapters/auth/saml/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/package.json)
- [src/adapters/auth/saml/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/saml/index.ts)
