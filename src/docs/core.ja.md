# コア

## 概要

`src/core/` はCognisの基盤レイヤーです。プラットフォームの残りの部分が依存するプロバイダーに依存しないコントラクト、インターフェース、およびポリシーサービスが含まれています。コアはどのような機能が存在し、それらを統治するどのようなルールがあるかを定義します — それらの機能の具体的な実装を含むことはありません。

重要なルールは、コアがゲートウェイまたはアダプターコードからインポートしないことです。依存関係の矢印は常に内側を向いています：ゲートウェイはコアからインポートし、コアはゲートウェイが存在することを知りません。この不変条件によりコアは安定して独立してテスト可能であり、ゲートウェイやアダプターを交換してもコントラクトレイヤーが壊れないことが保証されます。

コアは現在2つのサービスと4つのケイパビリティネームスペースを公開しています。これらは意図的に最小限です — 設計哲学はドメインロジックがコアではなくゲートウェイに存在するというものです。コアはライフサイクル（モジュール）、ヘルスレポート、およびゲートウェイが実装する共有インターフェースの定義に関心を持ちます。

## 責任範囲

- ゲートウェイが使用する `DatabaseGateway`、`FileStorageGateway`、`AuthAccountStore`、`AuthContext`、その他の横断的インターフェースを定義する。
- モジュールのライフサイクル管理（検出、有効化、無効化、ポインター書き込み、ルート安全性強制）のための `ModuleService` を提供する。
- プラットフォームのヘルスとアップタイムメタデータのための `HealthService` を提供する。
- すべてのモジュールが満たさなければならない `ModuleManifest` コントラクトを定義する。
- ケイパビリティネームスペース `system:health`、`auth:accounts`、`modules:lifecycle`、`ui:shell` を公開する。

担当外: 認証の実装、データの保存、通知の送信、またはプロバイダーSDKに触れる操作。

## アーキテクチャ

### 主要なソースの場所

| パス                                    | 目的                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `src/core/contracts/auth-account.ts`    | `AuthAccount`、`ExternalIdentity`、`AuthAccountStore` インターフェース |
| `src/core/contracts/module-manifest.ts` | `ModuleManifest` インターフェース                                      |
| `src/core/services/module-service.ts`   | `ModuleService` クラス                                                 |
| `src/core/services/health-service.ts`   | `HealthService` クラス                                                 |
| `src/core/services/gateway-service.ts`  | ゲートウェイレジストリサービス                                         |
| `src/core/index.ts`                     | `@cognis/core` パッケージのパブリックエクスポート                      |

### ModuleService

`src/core/services/module-service.ts` の `ModuleService` は完全なモジュールライフサイクルを管理します。`ModuleRuntimeGateway` 抽象化とオプションの `ModulePathResolver` で動作します。パスリゾルバーが存在する場合、有効化/無効化操作は信頼された内部ディレクトリまたは外部アーカイブのランタイム抽出ディレクトリを指すポインターファイル（nginx スタイルの `<id>.load` シンボリックリンク）を書き込み、削除します。

モジュールを有効化する前に、`ModuleService` は2つのガードレールを強制します：

- コアモジュール（マニフェストの `class: "core"`）は実行時に切り替えることができません。
- 外部モジュールはポインターが書き込まれる前に明示的な免責事項の確認が必要です。

ルート安全性はモジュールが有効化される前に強制されます：モジュールの `routes.json` が保護されたプレフィックス（`/api/v1/system`、`/api/v1/auth`、`/api/v1/users`、`/public`、`/ui`）の下のパスを宣言している場合、有効化は拒否されます。

```ts
// src/core/services/module-service.ts
export class ModuleService {
    async enable(
        moduleId: string,
        options?: { acknowledgeExternalDisclaimer?: boolean },
    ): Promise<{ moduleId: string; enabled: boolean }>;
    async disable(
        moduleId: string,
    ): Promise<{ moduleId: string; enabled: boolean }>;
    async list(): Promise<ModuleManifest[]>;
}
```

### HealthService

`src/core/services/health-service.ts` の `HealthService` はサーバーの起動時刻を記録し、要求に応じて `HealthStatus` オブジェクトを返します。起動タイムスタンプ以外はステートレスです。

```ts
export interface HealthStatus {
    status: "ok";
    timestamp: string;
    startedAt: string;
    uptimeMs: number;
}
```

### AuthAccountStore インターフェース

`src/core/contracts/auth-account.ts` の `AuthAccountStore` は、認証アダプターがアカウントの永続化に実装しなければならないインターフェースです。外部IDによるアカウントの検索、外部アカウントの作成、ローカルアカウントの作成をカバーします。

```ts
export interface AuthAccountStore {
    findByExternalIdentity(
        provider: string,
        externalUserId: string,
    ): Promise<AuthAccount | null>;
    createExternalAccount(identity: ExternalIdentity): Promise<AuthAccount>;
    updateExternalAccount(
        accountId: string,
        identity: ExternalIdentity,
    ): Promise<AuthAccount>;
    createLocalAccount(input: {
        username: string;
        passwordHash: string;
        email?: string;
        isAdmin?: boolean;
    }): Promise<AuthAccount>;
}
```

### ケイパビリティネームスペース

| ケイパビリティ      | 所有者                | 説明                                                                                 |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `system:health`     | コア / システムルート | `GET /api/v1/system/health` を通じてプラットフォームのヘルスとアップタイムを公開する |
| `auth:accounts`     | 認証ゲートウェイ      | 組み込みアカウントライフサイクルと認証ポリシーの配線                                 |
| `modules:lifecycle` | モジュールルート      | モジュール一覧表示、有効化/無効化コントロール、ポリシーチェック                      |
| `ui:shell`          | UIルート              | 共有アプリケーションシェルルーティングと管理操作サーフェス                           |
