# モジュールフレームワーク

## 概要

Cognis モジュールフレームワークにより、サードパーティおよびコミュニティの開発者はコアを変更することなく、新しい学習モード、インテグレーション、および UI ページでプラットフォームを拡張できます。モジュールは `manifest.json` を宣言し、API ルートを登録し、UI ページを提供し、オプションで CLI サブコマンドを追加する自己完結型のディレクトリまたはアーカイブです。コアモジュール (`class: "core"`) はプラットフォームに同梱され、切り替えることができません。拡張モジュールは、管理 API または `cognisctl` を通じてランタイムで有効化、無効化、インストール、および削除できます。

## 責務

- `COGNIS_MODULES_ROOT` (デフォルト `src/modules`) からモジュールマニフェストを検出してロードする。
- `ModuleRuntimeGateway` インターフェースを通じて `enable` および `disable` 操作を公開する。
- 有効な各モジュールの `entrypoints.api` ファイルから API ルートプラグインを動的にインポートする。
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

`src/modules/routes/module-extensions.ts` の `createModuleExtensionRoutes` は、`entrypoints.api` を宣言するすべての有効なモジュールの `registerApiRoutes` を呼び出します。ルートは `refresh()` を通じてすべての有効化/無効化サイクルで再ロードされます。

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

| メソッド | パス                          | 説明                                                              | 認証   |
| -------- | ----------------------------- | ----------------------------------------------------------------- | ------ |
| `GET`    | `/api/v1/modules`             | 有効/無効の状態とともにインストール済みモジュールをすべて一覧表示 | Bearer |
| `POST`   | `/api/v1/modules/:id/enable`  | モジュールを有効化                                                | Admin  |
| `POST`   | `/api/v1/modules/:id/disable` | モジュールを無効化                                                | Admin  |
| `POST`   | `/api/v1/modules/install`     | アップロードされたアーカイブからモジュールをインストール          | Admin  |
