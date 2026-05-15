# LINE Messenger SSO アダプター

## 概要

このアダプターは Cognis の認証に LINE Login を追加します。

Authorization Code + PKCE フローに対応しているため、LINE アプリを
インストールしたモバイルユーザーも、LINE アプリ経由で認証して
設定済みのリダイレクト URI に戻れます。

## 対応ライフサイクル

- 初回ログイン成功時の LINE ID からのアカウント自動作成。
- ログイン時の表示名とプロフィール画像 URL メタデータのライブ同期。
- `active`、`unlinked`、`deactivated`、`deleted` 状態の反映。
- 公開登録が無効な場合は Registration Gateway へフォールバックし、
  管理者承認待ちの登録リクエストを作成してからアカウント利用を許可。

## 必須設定

- `channelId`
- `redirectUri`

任意:

- `channelSecret`
- `usePkce`
- `accountIdPrefix`
- `tokenEndpoint`
- `profileEndpoint`
- `verifyIdTokenEndpoint`

## モバイル実装メモ

モバイル Web / ネイティブでは、LINE 公式の Authorization Code + PKCE
手順に従い、`authorizationCode`（PKCE 利用時は `codeVerifier` も）を
`provider: "line"` とともに `/api/v1/auth/login` へ送信してください。

参照:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
