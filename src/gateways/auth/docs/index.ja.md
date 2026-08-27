# 認証ゲートウェイ

## 概要

認証ゲートウェイは、Cognisにおけるすべてのログインおよびアイデンティティ操作の単一のエントリポイントです。ルートハンドラーと具体的な認証アダプターの間に位置することで、プラットフォームの残りの部分を特定の認証プロバイダーから切り離します。認証プロバイダーの切り替え（ローカルパスワードからLDAPやSAMLへ）は、管理者APIで新しいアダプターを有効にするだけで済みます。ルートハンドラーやコアサービスの変更は不要です。

ゲートウェイはブートストラップ時に `src/adapters/auth/` をスキャンしてアダプターを検出します。各アダプターディレクトリは `createAdapter()` 関数をエクスポートする必要があります。ローカルアダプターは常に最初に読み込まれ、`user:*` CLIコマンドと初期管理者アカウント作成フローを支援するため特別に扱われます。他のすべてのアダプターはディレクトリから読み込まれ、サーバーを再起動せずに管理者が実行時に有効・無効を切り替えられます。

## 責務

- ブートストラップ時に `src/adapters/auth/` からすべての認証アダプターを検出・登録する。
- `auth_adapter_configs` に永続化されたアダプターの有効・無効状態を管理する。
- 要求されたプロバイダーの有効なアダプターに委譲して認証情報を検証する。
- 認証成功後に `issueAccessToken` でアクセストークンを発行する。
- 文書化されたケイパビリティ一式を提供する：`auth:accountStore`、`auth:createLocalAdmin`、`auth:getLoginMethods`、`auth:registerProvider`、`auth:registerPageScriptOrigins`、`auth:issueAccessToken`、`auth:getAuthClaims`、`auth:requireAuth`、`auth:requireRoleAccess`、`auth:revokeAccessTokensForSubject`、`auth:revokeSetupPendingAccessTokens`、`auth:routeContext`。
- すべての認証APIルートとアダプター管理ルートを登録する。

責務外: ユーザープロフィールデータの保存（プロフィールゲートウェイの責務）、トークン発行を超えたセッション管理、非認証ビジネスロジック。

## アーキテクチャ

中心クラスは `src/gateways/auth/gateway.ts` の `CoreAuthGateway` です。登録されたアダプターのマップ、有効なアダプターIDのセット、ローカルアダプターへの参照（`setLocalAdapter()` で別途設定）を保持します。

```ts
export class CoreAuthGateway {
  registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): () => boolean;
  setLocalAdapter(adapter: AuthProviderAdapter & { ... }): void;
  async discoverAdapters(authAdaptersRoot: string): Promise<void>;
  async loadPersistedConfigs(): Promise<void>;
  async getEnabledAdapter(id: string): Promise<AuthProviderAdapter | null>;
  async getAdapter(): Promise<AuthProviderAdapter | null>;
  async authenticate(credentials: Record<string, unknown>, providerId?: string): Promise<AuthContext | null>;
  async createLocalAdmin(username: string, password: string): Promise<AuthContext>;
  async getLoginMethods(): Promise<AdapterInfo[]>;
}
```

`getEnabledAdapter(id)` は特定のアダプターが現在有効な場合のみIDで返します。`getAdapter()` （引数なし）は最初の有効なアダプターを返します。適切なアダプターが見つからない場合は両方とも `null` を返します。

`registerAdapter()` は、モジュールの破棄処理が使用するプロバイダーのクリーンアップ関数を返します。呼び出すと、そのプロバイダー登録、有効化状態、依存関係メタデータだけが削除されます。同じIDが別のプロバイダーに置き換えられている場合、置き換え後のプロバイダーは削除されません。モジュールを無効化すると、そのモジュールが提供したすべてのケイパビリティを取り除く必要があるため、このクリーンアップが必要です。

`src/gateways/auth/bootstrap.ts` と `src/gateways/auth/bootstrap/` でのブートストラップ:

1. `src/adapters/auth/local/store.ts` から `DbLocalAccountStore` をインスタンス化。
2. DBエグゼキューターとタイプで `CoreAuthGateway` をインスタンス化。
3. `setLocalAdapter()` でローカルアダプターを読み込む。
4. `discoverAdapters(authAdaptersRoot)` を呼び出して他のすべてのアダプターを読み込む。
5. `loadPersistedConfigs()` を呼び出してデータベースから有効・無効状態を復元。
6. `src/gateways/auth/bootstrap/` の capability / bootstrap hook を実行。
7. ルートとケイパビリティを登録。

提供されるケイパビリティ:

| ケイパビリティ                   | 型                                             | 説明                                                                            |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `auth:accountStore`              | `LocalAccountStore`                            | ローカルアダプターが使用するローカルアカウントストア                            |
| `auth:createLocalAdmin`          | `(username, password) => Promise<AuthContext>` | 存在しない場合に管理者アカウントを作成                                          |
| `auth:getLoginMethods`           | `() => Promise<AdapterInfo[]>`                 | すべての有効なプロバイダーのメタデータを返す                                    |
| `auth:registerProvider`          | `(provider, requires?) => dispose`             | モジュール認証プロバイダーを登録し、そのクリーンアップ関数を返す                |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | ページのCSPヘッダーで1つの所有者の信頼済みhttp(s)スクリプトオリジンを置き換える |

## APIルート

| メソッド | パス                                         | 説明                               | 認証     |
| -------- | -------------------------------------------- | ---------------------------------- | -------- |
| `GET`    | `/api/v1/auth/login-methods`                 | 有効な認証プロバイダーを一覧表示   | 不要     |
| `POST`   | `/api/v1/auth/register`                      | 新しいローカルアカウントを自己登録 | 不要     |
| `POST`   | `/api/v1/auth/login`                         | 認証してBearerトークンを返す       | 不要     |
| `POST`   | `/api/v1/auth/verify`                        | 現在のユーザーのパスワードを検証   | ユーザー |
| `GET`    | `/api/v1/gateways/auth/adapters`             | 登録済み認証アダプターを一覧表示   | 管理者   |
| `GET`    | `/api/v1/gateways/auth/adapters/:id/config`  | アダプターの設定スキーマを取得     | 管理者   |
| `PUT`    | `/api/v1/gateways/auth/adapters/:id/config`  | アダプターの設定を更新             | 管理者   |
| `POST`   | `/api/v1/gateways/auth/adapters/:id/test`    | アダプター設定をテスト             | 管理者   |
| `POST`   | `/api/v1/gateways/auth/adapters/:id/enable`  | アダプターを有効化                 | 管理者   |
| `POST`   | `/api/v1/gateways/auth/adapters/:id/disable` | アダプターを無効化                 | 管理者   |

アダプターテストの失敗には、任意の数の設定項目 ID を安全な診断メッセージに対応付ける `error.fieldErrors` オブジェクトが含まれる場合があります。

## ブラウザーキーリング起動

認証ゲートウェイは、ブラウザーセッションフックを登録する前に必須キーリングアダプターを読み込みます。これにより、ページの直接読み込みや再読み込みのたびに、現在のタブの抽出不可能なセッション鍵を自動復元できます。復元できない場合は、保護されたコンテンツを最初に解決するときにコンテキスト付きキーリング解除ダイアログを開きます。

## 共有失敗理由の伝達

ブラウザーセッション結果は中立な代替認証失敗理由を保持するため、公開リソースページは認証内部を import せずに、存在しないリソースとその他の利用不可状態を区別できます。
