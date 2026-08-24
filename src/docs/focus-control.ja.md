# フォーカス制御

## マニフェストスキーマ

ページと Composer 要素は、安定 ID、翻訳キー、登録済みルート、表示モード、直列化可能な状態を持つ `focusControl` を宣言できます。メッセージ内の HTML とコールバックは拒否されます。

## フローとプロバイダー

名前付きフローが宣言、認可、開始、読み込み、公開、適用、制御移譲、終了を分離します。プロバイダーは ctx 経由でのみ機能を登録します。

## セキュリティと同期

各操作を認証し、共同作業リソースに限定して、変更ごとにメンバー資格と役割を検証します。状態は 64 KiB 以下で、単調増加リビジョンにより競合を防ぎ再接続を支援します。

## 外部モジュール

ホワイトボードは検出済みモジュールルートを指定します。同期状態は安定したリソース参照と表示メタデータだけを含み、文書共同編集は専用プロバイダーを使い続けます。

## コンポーネントページの利用条件

外部モジュールのページは、Bootstrap が SPA ルートを `componentPage` 付きで登録した場合に限り、他のコンポーネントから利用できます。宣言には `labelKey` と `descriptionKey` の小文字ローカライズキー、および対応モード（`overlay`、`fullscreen`、`pip`）を1つ以上指定します。Cognis は検証済みマニフェストからモジュール UUID を付与します。モジュールが別モジュールのファイルパスやスクリプト URL を指定または推測してはいけません。

新しいローカライズキーでは、`module.example.canvas.label` のように単語区切りへピリオドを使用します。単語間にアンダースコアやハイフンを追加してはいけません。すでに登録されたモジュール ID にハイフンが含まれる場合のみ、モジュール名前空間セグメント内で維持できます。

```js
ctx.registerSpaRoute({
    id: "whiteboard.canvas",
    pattern: "^/whiteboards/[^/]+$",
    base: "/whiteboards",
    scriptUrl: "/static/modules/nextcloud-whiteboard/app.js",
    componentPage: {
        labelKey: "module.nextcloud-whiteboard.canvas.label",
        descriptionKey: "module.nextcloud-whiteboard.canvas.description",
        modes: ["overlay", "fullscreen"],
    },
});
```

ページエントリーモジュールは `mount(root, { signal, focusState })` をエクスポートし、中断シグナルに従い、`root` 内だけに描画し、`focusState` でシリアライズ可能な呼び出し元コンテキストを受け取る必要があります。利用許可は表示だけを公開します。認可、リソース作成、参加者アクセス、永続化、文書のライブ同期は提供モジュールの責任です。

## 別コンポーネントのページを要求

要求側は、不変のマニフェスト UUID と安定したルート ID で提供元を指定します。ブラウザーコードは `uiCtx.capabilities` から `component-pages:request` を取得し、提供元を直接インポートしたり Asset URL を組み立てたりしてはいけません。モジュールが無効、アクセス不能、未導入、またはルートをコンポーネント利用に公開していない場合、Capability は `null` を返します。

`elementId` を渡した場合、Cognis は既存の DOM 要素を取得し、宣言済みのコンポーネントページ用スタイルとエントリーモジュールを読み込み、その要素と呼び出し元コンテキストを `focusState` として `mount` に渡します。呼び出し元は要求前にホスト要素を作成して所有し、英数字、ピリオド、アンダースコア、コロン、ハイフンだけで構成した ID とページの `AbortSignal` を渡す必要があります。対象が存在しないか無効な場合は `null` を返します。`elementId` を省略した場合は、従来どおりルート記述子だけを解決します。

同期 Focus Control では、その UUID を `moduleId`、利用可能なルート ID を `routeId` とする `module-route` ローダーを宣言します。コラボレーションプロバイダーは引き続き要求を認可し、サーバー側の ctx Capability を通じて Whiteboard を作成または解決し、会議参加者へアクセス権を付与し、`focus:transport` では安定したリソース識別子だけを公開する必要があります。

## 組み込みコンポーネントページ

Cognis に同梱される認証済み Dashboard ページは Cognis Core UUID `b4d49c4a-61d0-5db2-84fd-f89b80fd6398` を使用し、Study は Gateway UUID `338b9237-a2c8-5bcf-9437-bccc9abd9a27` を使用します。安定したルート ID は `core.dashboard`、`core.settings`、`core.users`、`core.invite`、`core.modules`、`core.administration`、`core.docs`、`core.changelogs`、`core.license`、`core.error`、`gateway.study`、`gateway.study.child` です。外部モジュールと同じ `component-pages:request` 契約を使用し、Overlay または全画面の埋め込みに対応します。Login とデモ用エントリーは Dashboard Shell のコンポーネントページではないため利用対象外です。
