# 認証ゲートウェイ

## 概要

認証ゲートウェイは、Cognisにおけるすべてのログインおよびアイデンティティ操作の単一のエントリポイントです。ルートハンドラーと具体的な認証アダプターの間に位置することで、プラットフォームの残りの部分を特定の認証プロバイダーから切り離します。認証プロバイダーの切り替え（ローカルパスワードからLDAPやSAMLへ）は、管理者APIで新しいアダプターを有効にするだけで済みます。ルートハンドラーやコアサービスの変更は不要です。

ゲートウェイはブートストラップ時に `src/adapters/auth/` をスキャンしてアダプターを検出します。各アダプターディレクトリは `createAdapter()` 関数をエクスポートする必要があります。ローカルアダプターは常に最初に読み込まれ、`user:*` CLIコマンドと初期管理者アカウント作成フローを支援するため特別に扱われます。他のすべてのアダプターはディレクトリから読み込まれ、サーバーを再起動せずに管理者が実行時に有効・無効を切り替えられます。

## 責務

- ブートストラップ時に `src/adapters/auth/` からすべての認証アダプターを検出・登録する。
- `auth_adapter_configs` に永続化されたアダプターの有効・無効状態を管理する。
- 要求されたプロバイダーの有効なアダプターに委譲して認証情報を検証する。
- 認証成功後に `issueAccessToken` でアクセストークンを発行する。
- 文書化されたケイパビリティ一式を提供する：`auth:accountStore`、`auth:createLocalAdmin`、`auth:getLoginMethods`、`auth:registerProvider`、`auth:registerLoginButton`、`auth:registerPageScriptOrigins`、`auth:issueAccessToken`、`auth:getAuthClaims`、`auth:requireAuth`、`auth:requireRoleAccess`、`auth:revokeAccessTokensForSubject`、`auth:revokeSetupPendingAccessTokens`、`auth:routeContext`。
- すべての認証APIルートとアダプター管理ルートを登録する。

責務外: ユーザープロフィールデータの保存（プロフィールゲートウェイの責務）、トークン発行を超えたセッション管理、非認証ビジネスロジック。

### 実行時プロバイダーのライフサイクル

実行時ブラウザー向け OAuth リダイレクトでは `/sso/<routeNamespace>/<path>` を使用できます。Cognis はクエリ形式のコールバックをプロバイダーへ直接渡し、フラグメント形式の応答も同じサーバー所有コールバックへ橋渡しするため、読み込み表示が残り続けません。コールバック失敗時は、ローカライズされたエラーとともにログインへ戻ります。

プロバイダーは LDAP と同様に、認証ゲートウェイを設定と電源状態の権限元として使用する必要があります。プロバイダーは安定した `id`、`getConfigSchema()`、`configure(config)`、`isConfigured()` を提供し、管理画面は `/api/v1/gateways/auth/adapters/<id>/config` を読み書きし、`/enable` または `/disable` で切り替えます。モジュール側で別の有効化フラグを保持したり、モジュールの有効化をアダプターの有効化と同一視したりしてはいけません。

ブートストラップでは、ルートやログイン表示を登録する前に `auth:registerProvider(provider, requires)` を待機します。この Promise は、Cognis がアダプターの保存済み設定と有効状態を復元した後にのみ完了します。その後にブランド付きボタンを登録し、両方の破棄関数を保持し、終了処理ではプロバイダー登録を解除する前にボタンを削除します。保存済みの有効状態がないプロバイダーは無効状態で開始し、ゲートウェイ所有のアダプター設定フローでセットアップを完了する必要があります。

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
| `auth:registerProvider`          | `async (provider, requires?) => dispose`       | モジュール認証プロバイダーを登録し、そのクリーンアップ関数を返す                |
| `auth:registerLoginButton`       | `(descriptor) => dispose`                      | ブランド固有のログインボタン表示を登録し、そのクリーンアップ関数を返す          |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | ページのCSPヘッダーで1つの所有者の信頼済みhttp(s)スクリプトオリジンを置き換える |

認証プロバイダーは `auth:registerProvider` を待機してから `auth:registerLoginButton` を呼び出す必要があります。登録処理は完了前にアダプターの保存済み設定と有効状態を復元し、LDAP のようなファイルシステム検出プロバイダーと同じライフサイクルになります。記述子には、登録済みの `providerId`、完全にローカライズされた `label`、同一オリジンの `iconUrl` が必要です。任意の `backgroundColor`、`borderColor`、`textColor` には 6 桁の 16 進色を使用します。ログインページは、コンパクト表示とワイド表示の両方でアイコンと完全なラベルを常に表示します。プロバイダーは、提供を無効にするときに返されたクリーンアップ関数を呼び出す必要があります。 スタイルが指定されていない非認証情報方式は、汎用ログインボタンとして表示せず除外されます。

プロバイダーはアダプターに `routeNamespace` と `registerRoutes(router)` を宣言できます。ルーターは `/api/v1/auth/<routeNamespace>` からの相対 `GET` および `POST` パスを受け付けるため、提供元モジュールに保護されたコアルートへの直接アクセスを与えず、OAuth コールバックを認証ゲートウェイ配下に配置できます。名前空間は安全な URL セグメントに制限され、認証コアの名前空間は予約され、重複ルートは拒否され、プロバイダーを削除すると提供されたすべてのルートも削除されます。

外部プロバイダーのセッションは、`ensureExternalAccount` の前に `gateAccountCreation` を通過します。公開登録が無効な場合、セッションには登録トークンと一致するプロバイダーのメールアドレスが必要です。保留されたセッションは `emailRequired`、`registrationTokenRequired`、`retryEndpoint` を含む `account_creation_required` を返します。プロバイダー UI は同じプロバイダー ID とともにトークンおよび必要なメールアドレスをそのエンドポイントへ送信し、プロバイダーアダプターが認証済み ID のみを返す場合でも Cognis がそれらをアカウント作成ゲートへ引き渡します。再試行せずキャンセルすると、アカウントを作成せずログインを中止します。

## APIルート

| メソッド | パス                                         | 説明                                         | 認証     |
| -------- | -------------------------------------------- | -------------------------------------------- | -------- |
| `GET`    | `/api/v1/auth/login-methods`                 | 有効な認証プロバイダーを一覧表示             | 不要     |
| `POST`   | `/api/v1/auth/register`                      | 新しいローカルアカウントを自己登録           | 不要     |
| `POST`   | `/api/v1/auth/login`                         | 認証してBearerトークンを返す                 | 不要     |
| `POST`   | `/api/v1/auth/sso/start`                     | 外部プロバイダーの認可リダイレクトを開始する | なし     |
| `POST`   | `/api/v1/auth/verify`                        | 現在のユーザーのパスワードを検証             | ユーザー |
| `GET`    | `/api/v1/gateways/auth/adapters`             | 登録済み認証アダプターを一覧表示             | 管理者   |
| `GET`    | `/api/v1/gateways/auth/adapters/:id/config`  | アダプターの設定スキーマを取得               | 管理者   |
| `PUT`    | `/api/v1/gateways/auth/adapters/:id/config`  | アダプターの設定を更新                       | 管理者   |
| `POST`   | `/api/v1/gateways/auth/adapters/:id/test`    | アダプター設定をテスト                       | 管理者   |
| `POST`   | `/api/v1/gateways/auth/adapters/:id/enable`  | アダプターを有効化                           | 管理者   |
| `POST`   | `/api/v1/gateways/auth/adapters/:id/disable` | アダプターを無効化                           | 管理者   |

アダプターテストの失敗には、任意の数の設定項目 ID を安全な診断メッセージに対応付ける `error.fieldErrors` オブジェクトが含まれる場合があります。

アダプターがローカライズ済みの管理リソースを所有する場合、アダプター一覧と設定契約に `stringsBaseUrl` が含まれます。

## ブラウザーキーリング起動

認証ゲートウェイは、ブラウザーセッションフックを登録する前に必須キーリングアダプターを読み込みます。これにより、ページの直接読み込みや再読み込みのたびに、現在のタブの抽出不可能なセッション鍵を自動復元できます。復元できない場合は、保護されたコンテンツを最初に解決するときにコンテキスト付きキーリング解除ダイアログを開きます。

## 共有失敗理由の伝達

ブラウザーセッション結果は中立な代替認証失敗理由を保持するため、公開リソースページは認証内部を import せずに、存在しないリソースとその他の利用不可状態を区別できます。

認証ソースの変更は、永続化後に `reconcile-auth-sources` フローを実行します。アダプターフックは `reconcile-accounts` ステージを使用し、ルート側でプロバイダー分岐を行わずにセッション失効とソース所有の識別情報調整を実施します。

## ブラウザーセッションの境界

パスワード確認の無効化は、認証済みの完全なアカウントセッションでのみ実行されます。匿名ページや Share ゲストページの初期化では、アカウント専用の `DELETE /api/v1/auth/verify` 要求を送らずにキーリング状態をロックまたは置換できます。

## 外部プロフィールプロバイダー

SSO モジュールは CTX を介して `auth:registerExternalProfileProvider` を登録できます。リゾルバーはプロバイダー ID、Cognis アカウント ID、外部ユーザー ID、認証済みプロバイダーセッションを受け取り、検索可能なハンドル、表示名、自己紹介、所在地、Web サイト、アバターおよびバナーのデータを返せます。プロバイダーセッションに `handle` または `username` がある場合、Cognis は不透明な外部アカウント ID ではなく、その値を初期プロフィールハンドルとして使用します。プロフィールアダプターが外部アカウントの初回作成時に自身の保存機能で反映します。

### 外部プロフィールの同期

外部認証連携は CTX クエリ `auth:syncExternalProfile` を提供できます。このクエリは認証済みアカウントの `{ providerId }` を受け取り、`auth:resolveExternalProfile` を介してプロバイダー所有のプロフィールを更新し、Cognis がプロフィールおよびファイルのケイパビリティを通じてハンドル、表示項目、アバターデータ、バナーデータを保存した後にのみ完了します。プロバイダーの画像 URL は連携への入力に限定し、ブラウザー画面が常に Cognis 所有のファイルを表示できるよう、クエリはメディアデータを返す必要があります。ブラウザー連携は同名の UI ケイパビリティを提供し、自分のプロフィールのバナーメニューはプロバイダー名やモジュール名を知らずにこれを検出します。

### 削除済みの外部 ID

外部認証アカウントを削除すると、アカウント所有データを削除する前に、そのプロバイダー ID の一方向フィンガープリントが保存されます。以後、認証と照合はその ID を拒否するため、有効なプロバイダーセッションが削除済み Cognis アカウントを暗黙に再作成することはありません。フィンガープリントはブラウザークライアントには公開されません。
