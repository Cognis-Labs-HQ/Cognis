# モジュールフレームワーク

## 概要

Cognis モジュールフレームワークにより、サードパーティおよびコミュニティの開発者はコアを変更することなく、新しい学習モード、インテグレーション、および UI ページでプラットフォームを拡張できます。モジュールは `manifest.json` を宣言し、API ルートを登録し、UI ページを提供し、オプションで CLI サブコマンドを追加する自己完結型のディレクトリまたはアーカイブです。コアモジュール (`class: "core"`) はプラットフォームに同梱され、切り替えることができません。拡張モジュールは、管理 API または `cognisctl` を通じてランタイムで有効化、無効化、インストール、および削除できます。

## 責務

- `COGNIS_MODULES_ROOT` (デフォルト `src/modules`) からモジュールマニフェストを検出してロードする。
- `ModuleRuntimeGateway` インターフェースを通じて `enable` および `disable` 操作を公開する。
- 有効な各モジュールをブートストラップエントリポイント (`entrypoints.bootstrap`) からロードし、機能提供を ctx 経由に統一する。
- モジュールルートが保護されたシステムプレフィックスを上書きしないようにブロックする。
- モジュールが有効化または無効化されたときに登録済みモジュールルートを更新する。

責務外: モジュールレベルのデータ永続化の提供 (モジュールは `db:executor` 機能を使用します)、モジュール UI ページのレンダリング (モジュールは `entrypoints.ui` を通じて独自の HTML エントリポイントを提供します)。

## アーキテクチャ

### モジュールの検出

起動時に `ModuleService` は `COGNIS_MODULES_ROOT` をスキャンして `manifest.json` を含むディレクトリを探します。有効な各マニフェストは `ModuleManifest` オブジェクトに解析されます。

**nginx スタイルの有効化:** 有効なモジュールは `{modulesRoot}/{moduleId}.load` のポインターファイルで示されます。ファイルを作成するとモジュールが有効になり、削除すると無効になります。これは nginx の `sites-enabled` シンボリックリンクパターンを踏襲しており、モジュールの有効化/無効化がプロセスの再起動後も保持されるファイルシステム操作であることを意味します。

### 内部モジュールと外部モジュール

| 種別       | ソース                                                | インストール                               | 免責事項       |
| ---------- | ----------------------------------------------------- | ------------------------------------------ | -------------- |
| `internal` | `src/modules/` 下のリポジトリにバンドル               | プリインストール                           | なし           |
| `external` | アップロードされた `.zip` または `.tar.gz` アーカイブ | 管理 API または `modules:install` CLI 経由 | 有効化前に表示 |

外部モジュールは圧縮アーカイブをアップロードしてインストールします。フレームワークはアーカイブを展開し、`manifest.json` を検証して、`COGNIS_MODULES_ROOT` 下にモジュールディレクトリを配置します。

### ModuleManifest コントラクト

```ts
export interface ModuleManifest {
    id: string;
    name: string;
    version: string;
    publisher?: string;
    class: "core" | "extension";
    coreApiVersion: string;
    capabilities: string[];
    requires?: string[];
    entrypoints: {
        bootstrap?: string;
        api?: string;
        ui?: string;
        cli?: string;
        db?: string;
    };
}
```

`class: 'core'` のモジュールは API を通じて無効化できません。`requires` は、モジュールが機能するために有効でなければならないゲートウェイ ID を列挙します。管理 UI は、モジュールを有効化する前に無効化された依存関係を有効化するよう促します。

### フロントエンドコントラクト

`entrypoints.ui` を提供するモジュールは、モジュールディレクトリからの宣言されたパスにページをエクスポートする必要があります。プラットフォームは標準の `<script src="/ui/main.js">` と `<link rel="stylesheet" href="/ui/styles.css">` を注入し、モジュールページは共有シェルでレンダリングされます。

### API ルートの登録

```ts
export function registerApiRoutes(router) {
    router.get(
        "/api/v1/modules/my-module/data",
        async (req, res) => {
            // handler
        },
        { access: { minRole: "moderator" } },
    );
    router.post(
        "/api/v1/modules/my-module/admin-audit",
        async (req, res) => {
            // handler
        },
        { access: { onlyRole: "owner" } },
    );
}
```

`src/modules/routes/module-extensions.ts` の `createModuleExtensionRoutes` は、`entrypoints.bootstrap` がある場合それを優先してモジュールをロードします。ブートストラップには ctx (`moduleId`, `moduleRoot`, `getCapability`, `router`, `registerApiGet`, `registerApiPost`, UI 登録メソッド) が渡され、これが唯一の連携面です。

モジュール間またはコアからモジュールへの直接 import は禁止です。機能連携は必ず ctx を通します。

各モジュールルートは、3 番目の router 引数で任意のアクセス
ポリシーメタデータを宣言できます:

- `access.minRole` — 対象ロールとそれより上位のロールを許可
  (`user < teacher < moderator < admin < owner`)
- `access.onlyRole` — 単一のロールグループのみ許可

### 保護されたルートプレフィックス

モジュールルートは以下のプレフィックスで始まってはいけません:

| プレフィックス   | 理由                         |
| ---------------- | ---------------------------- |
| `/api/v1/system` | コアシステムエンドポイント   |
| `/api/v1/auth`   | 認証ゲートウェイ             |
| `/api/v1/users`  | ユーザー管理                 |
| `/public`        | プラットフォーム静的アセット |
| `/ui`            | プラットフォーム UI アセット |

保護されたプレフィックスの下にルートを登録しようとすると、モジュール有効化がブロックされます。

`routes.json` は、通常のルート文字列と、UI ページ向けアクセス
ポリシーメタデータ付きルートオブジェクトの両方をサポートします:

```json
[
    "/api/v1/modules/my-module/data",
    { "path": "/my-module/page", "access": { "minRole": "admin" } },
    { "path": "/my-module/owner-audit", "access": { "onlyRole": "owner" } }
]
```

## 設定

| 変数                  | デフォルト                   | 説明                                                 |
| --------------------- | ---------------------------- | ---------------------------------------------------- |
| `COGNIS_MODULES_ROOT` | `src/modules` (cwd から解決) | モジュールサブディレクトリをスキャンするディレクトリ |

## API ルート

| メソッド | パス                            | 説明                                                              | 認証   |
| -------- | ------------------------------- | ----------------------------------------------------------------- | ------ |
| `GET`    | `/api/v1/modules`               | 有効/無効の状態とともにインストール済みモジュールをすべて一覧表示 | Bearer |
| `POST`   | `/api/v1/modules/:id/enable`    | モジュールを有効化                                                | Admin  |
| `POST`   | `/api/v1/modules/:id/disable`   | モジュールを無効化                                                | Admin  |
| `POST`   | `/api/v1/modules/install`       | アップロードされたアーカイブからモジュールをインストール          | Admin  |
| `POST`   | `/api/v1/modules/import/github` | GitHub リポジトリタグからモジュールアーカイブを取り込む           | Admin  |

## GitHub 取り込みライフサイクル

1. 管理者が Administration UI または `cognisctl modules:import-github` で `repositoryUrl` と `versionTag` を送信します。
2. API ルート `/api/v1/modules/import/github` が入力を検証し、`ModuleService.importFromGithub` に委譲します。
3. Service が `codeload.github.com` からタグアーカイブを取得し、バイト列を module runtime gateway に渡します。
4. Runtime が必須ファイル契約に従った drop-in モジュールディレクトリとしてインストールします。
5. 管理者が通常の `/enable` フローで有効化します。

## 新規モジュールの標準レイアウト

新規または再編成されたモジュールは、次のルートレイアウトに収束させます:

```text
src/modules/my-module/
  manifest.json
  routes.json
  bootstrap.ts
  docs/
    index.en.md
    index.de.md
    index.ja.md
    index.id.md
  api/
    index.ts
  ui/
  cli/
    index.js
  db/
```

必須:

- `manifest.json`（識別情報、機能、エントリポイント、依存関係メタデータ）
- `routes.json`（安全性チェックに使う API/UI ルート宣言）
- `bootstrap.js` または `bootstrap.ts`（モジュールをランタイム機能へ接続する薄い ctx ブリッジ）
- `docs/index.<lang>.md`（標準コンポーネントエントリーファイル名を使うモジュールドキュメント）
- `ui/` ディレクトリ（最初のリリースがシェルフックや未使用ページだけでも必須）

モジュールがバックエンドコードを提供する場合の標準:

- `api/index.js` または `api/index.ts`（モジュール所有のサーバーハンドラーと補助。`bootstrap.*` はロジック置き場ではなく薄い委譲役に保つ）

必要に応じた任意の兄弟ディレクトリ:

- `cli/index.js`（CLI コマンド登録）
- `db/`（スキーマ初期化またはマイグレーション）
- `tests/`（モジュールローカルの自動テスト）
- `content/`（モジュール所有の静的コンテンツ束）

補助ディレクトリは `docs/`、`api/`、`ui/` の横に置けますが、これらの安定した名前を独自の代替名で置き換えてはいけません。
