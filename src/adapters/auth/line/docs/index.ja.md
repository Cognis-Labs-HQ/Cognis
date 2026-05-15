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

## LINE Console 設定（チャネル + Callback URL）

1. LINE Developers Console で **LINE Login** チャネルを作成し、プロバイダーへ
   リンクします。
2. そのチャネルの **LINE Login** 設定画面で
   **Use LINE Login in your web app** を有効化します。
3. **Callback URL** に、この環境（本番 / ステージング / ローカル）で使う
   Cognis のリダイレクト先エンドポイントを設定して保存します。
4. チャネル値を Cognis に設定します。
    - `channelId` = LINE **Channel ID**
    - `channelSecret` = LINE **Channel secret**（PKCE のみのフローでは任意）
    - `redirectUri` = LINE の **Callback URL** と完全に同一の URL
5. Cognis の Administration → Authentication → LINE Messenger SSO →
   Configure で表示される Cognis 管理の Callback URL をコピーし、別の公開
   コールバックが必要でない限り `redirectUri` として保存してください。

## `redirectUri` について（共通の固定値ですか？）

`redirectUri` は LINE から取得する値ではなく、共通の固定値でもありません。
これは Cognis 側アプリのコールバック URL です。自分で定義・運用し、次の
2 箇所で同じ URL を使います。

- LINE Console: **Callback URL**
- Cognis アダプター設定: `redirectUri`

2 つの値が一致しない場合（パス、末尾スラッシュ、プロトコルを含む）、
LINE の authorization code 交換は失敗します。

## LINE メールアドレス開示要件のユーザー通知

ユーザーが LINE サインインへ進む前に、Cognis は LINE 要件を満たすため、
メールアドレス開示についての警告ポップアップを表示します。

## モバイル実装メモ

モバイル Web / ネイティブでは、LINE 公式の Authorization Code + PKCE
手順に従い、`authorizationCode`（PKCE 利用時は `codeVerifier` も）を
`provider: "line"` とともに `/api/v1/auth/login` へ送信してください。

参照:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/docs/line-login/getting-started/#channel-and-provider-linkage
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
