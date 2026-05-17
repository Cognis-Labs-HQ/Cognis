# ゲートウェイとアダプターの開発

## 概要

ゲートウェイはCognisにおける境界ドメインの唯一の権威です。そのドメインのスキーマ、ルート、ケイパビリティ、アダプターを所有します。プラットフォームの残りの部分はゲートウェイコードを直接インポートせず、共有の`CapabilityStore`からケイパビリティを消費するか、ゲートウェイのパブリックインターフェースを呼び出します。

アダプターはゲートウェイの下に存在する具体的な実装です。サーバー起動時に所有するゲートウェイによって検出・ブートストラップされます。コアもサーバーも、どのアダプターが存在するかを知りません。

## 責務

### ゲートウェイ

- アイデンティティと依存関係を宣言する`manifest.json`を持つ。
- サーバーが起動時に呼び出す`bootstrap(ctx)`関数をエクスポートする。
- ブートストラップ中に`GatewayRegistry`に登録する。
- `ctx.routeRegistry`を通じてHTTPルートを登録する。
- `ctx.capabilities`にケイパビリティを提供する。
- `src/adapters/<gateway-id>/`から独自のアダプターを検出・ブートストラップする。

### アダプター

- `bootstrap<Domain>Adapter(ctx)`関数をエクスポートする。
- ドメインロジック、スキーマセットアップ、ルート登録を実装する。
- `ctx.gateway.registerSender(...)`または`ctx.gateway.registerAdapter(...)`を呼び出してゲートウェイに自己登録する。
- `GatewayRegistry`に直接登録しない。

## アーキテクチャ

### ディレクトリ構造

```
src/gateways/<id>/
  manifest.json
  bootstrap.ts
  gateway.ts
  docs/
    index.en.md
    index.de.md
    index.ja.md
    index.id.md

src/adapters/<id>/<adapter-id>/
  package.json
  index.ts
  docs/
    index.en.md
    ...
  tests/
```

### manifest.json

```json
{
    "id": "notify",
    "name": "Notification Gateway",
    "version": "1.3.0",
    "description": "Pluggable notification dispatch.",
    "publisher": "Cognis Labs",
    "required": false,
    "requires": ["db"],
    "hasAdapters": true
}
```

| フィールド    | 必須   | 説明                                                           |
| ------------- | ------ | -------------------------------------------------------------- |
| `id`          | はい   | 一意の識別子。ディレクトリ名と一致する                         |
| `name`        | はい   | 人間が読めるメイン表示名                                       |
| `version`     | はい   | セマンティックバージョン。変更のたびに更新する                 |
| `description` | いいえ | 管理UIに表示される一文                                         |
| `required`    | いいえ | `true`の場合、ブートストラップ失敗時にサーバーが起動を拒否する |
| `requires`    | いいえ | この前に初期化が必要なゲートウェイのID配列                     |
| `hasAdapters` | いいえ | `true`の場合、管理UIにアダプターセクションを表示する           |

### bootstrap.ts

```ts
import type { GatewayBootstrapContext } from "../shared.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    // 1. 以前のゲートウェイが提供したケイパビリティを読む
    // 2. ゲートウェイクラスをインスタンス化する
    // 3. アダプターをブートストラップする
    // 4. ルートを登録する
    // 5. ケイパビリティを提供する
    // 6. ゲートウェイレジストリに登録する
    // 7. UIセクションを登録する
}
```

| フィールド        | 型                | 説明                                                   |
| ----------------- | ----------------- | ------------------------------------------------------ |
| `gatewayRegistry` | `GatewayRegistry` | `.register(manifest)`でゲートウェイを可視化する        |
| `capabilities`    | `CapabilityStore` | `.get<T>(key)`で読む; `.contribute(key, v)`で書く      |
| `routeRegistry`   | `RouteRegistry`   | `.register(handler, gatewayId?)`でHTTPルートを追加する |
| `uiRegistry`      | `UIRegistry`      | 管理セクションと静的ディレクトリを登録する             |
| `adaptersRoot`    | `string`          | `src/adapters/`への絶対パス                            |
| `log`             | `BootstrapLog?`   | ロギングゲートウェイ後に利用可能な構造化ロガー         |

### アダプター検出

```ts
try {
    await bootstrapFn(adapterCtx);
} catch (err) {
    ctx.log?.(
        "error",
        `アダプター "${entry}" のブートストラップ失敗 — スキップします。`,
        {
            component: "foo-gateway",
            adapter: entry,
            error: err instanceof Error ? err.message : String(err),
        },
    );
}
```

各アダプター呼び出しを個別の`try/catch`で囲む。エラーが伝播すると`GatewayService`がそれを無音でキャッチし、ゲートウェイが登録されなくなる。

### アダプターの作成

```ts
export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    const smtpHost = process.env.COGNIS_SMTP_HOST;
    if (!smtpHost) {
        ctx.log?.(
            "warn",
            "SMTPアダプター: COGNIS_SMTP_HOSTが設定されていません。",
        );
        return;
    }

    const sender = createSmtpSender(smtpHost, ctx.log);
    ctx.gateway.registerSender(sender);
}
```

- 必要なリソースが欠如している場合は警告をログして`return`する。例外をスローしない。
- すべてのセットアップが成功した後にのみ登録する。
- コンテキスト型は`bootstrap.ts`ではなく`gateway.ts`からインポートする。

### 起動順序

1. `files` — ファイルI/Oケイパビリティを提供
2. `logging` — `logging:log`を提供
3. `db` — `db:executor`と`db:type`を提供
4. その他すべてのゲートウェイ — アルファベット順

## 拡張ポイント

新しいアダプターを追加するには:

1. `src/adapters/<gateway-id>/<adapter-id>/`を作成する。
2. `name`、`version`、`main`を含む`package.json`を追加する。
3. `bootstrapFooAdapter(ctx)`をエクスポートする。
4. `docs/index.en.md`と言語バリアントを追加する。
5. `tests/`にテストを追加する。

新しいゲートウェイを追加するには:

1. `manifest.json`、`bootstrap.ts`、`gateway.ts`を含む`src/gateways/<id>/`を作成する。
2. `docs/index.en.md`と言語バリアントを追加する。
3. `src/docs/index.<lang>.md`のゲートウェイテーブルにエントリを追加する。
