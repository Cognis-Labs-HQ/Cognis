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

`component-pages:request` は利用可否だけを確認し、UI をマウントしません。コンポーネントウィンドウは、Whiteboard ボタンのクリックまたはキーボード操作ハンドラー内で `component-pages:spawn` を同期的に呼び出して開きます。呼び出し元が所有する既存ステージの ID とページの `AbortSignal` を渡します。Cognis は有効なユーザー操作を必須とし、ウィンドウをステージ内に封じ込め、リンクやフォームによる Dashboard Router へのナビゲーションを遮断し、提供側へ `navigationAllowed: false` を渡します。

Spawn Capability は `discard()` を持つハンドルを返します。閉じる操作や戻る操作で呼び出し元が破棄する必要があり、シグナルの中断時や SPA ルートの切り替え前にも自動的に破棄されます。ハンドルを保持しない場合は `component-pages:discard` にステージ ID を渡せ、Shell のライフサイクル調整には `component-pages:discardAll` を利用できます。Meeting ページの読み込み時に行う利用可否確認では `component-pages:request` だけを使います。提供側は渡された Root 内だけに描画し、シグナルを尊重し、破棄時にリソースを解放し、埋め込み中に直接ナビゲーションを実行してはいけません。

ステージ ID に使用できる文字は英数字、ピリオド、アンダースコア、コロン、ハイフンだけです。提供側が追加リソースを所有する場合、`mount` はクリーンアップ関数または `destroy` か `unmount` を持つオブジェクトを返します。

同期 Focus Control では、その UUID を `moduleId`、利用可能なルート ID を `routeId` とする `module-route` ローダーを宣言します。コラボレーションプロバイダーは引き続き要求を認可し、サーバー側の ctx Capability を通じて Whiteboard を作成または解決し、会議参加者へアクセス権を付与し、`focus:transport` では安定したリソース識別子だけを公開する必要があります。

## 枠なしコンポーネントウィンドウ

埋め込みページを呼び出し元所有のステージ全面に接して表示する場合は、`component-pages:spawn` に `borderless: true` を渡します。Cognis はコンポーネントウィンドウの外側の余白、内側の余白、境界線、角丸を除去し、ウィンドウと直下のコンテンツルートを親全体の大きさにして、プロバイダーのマウントオプションにも `borderless: true` を渡します。コンテンツ内部の間隔は引き続きプロバイダーが管理します。

枠なしコンポーネントがマウントされている間、Cognis はそれを含む `.app-page__main` の外側余白も除去します。そのページの最後の枠なしコンポーネントが破棄されると、通常のページ余白が自動的に復元されます。

コンポーネントウィンドウは独立した縦スクロール領域を作りません。ステージとウィンドウは通常の Flex レイアウト内で埋め込みコンテンツに合わせて伸び、コンポーネント上のホイール入力でもメインページがスクロールします。ポインター位置にかかわらず、ページ全体で一つのスクロール位置が維持されます。

### 枠なし統合における役割

- **Cognis ホスト:** `component-page-stage--borderless` を設定し、`component-page-window → app-shell → workspace → composer grid → widget` の全階層を伸縮させ、入れ子の Workspace 余白を除去して、`layout: { borderless: true, fillParent: true, scrollOwner: "document" }` をプロバイダーのマウントへ渡します。
- **ミーティング呼び出し元（Jitsi Meet など）:** `borderless: true` を要求し、ハンドルが有効な間はミーティングステージの固定高や切り取られたオーバーフローを、自動的に伸びる可視オーバーフローレイアウトへ置き換えます。コンポーネントを閉じる際はブローカーハンドルを破棄し、通常のビデオレイアウトを復元します。
- **ページプロバイダー（Nextcloud Whiteboard など）:** `borderless` と `layout` のマウントオプションを受け取り、Page Composer を `frameless: true` および `contentScrolling: false` で構築します。キャンバスラッパーは Composer Widget 全体を満たし、キャンバスステージは `overflow: auto` を宣言しません。ドキュメントのスクロールは Cognis が管理します。

## 組み込みコンポーネントページ

Cognis に同梱される認証済み Dashboard ページは Cognis Core UUID `b4d49c4a-61d0-5db2-84fd-f89b80fd6398` を使用し、Study は Gateway UUID `338b9237-a2c8-5bcf-9437-bccc9abd9a27` を使用します。安定したルート ID は `core.dashboard`、`core.settings`、`core.users`、`core.invite`、`core.modules`、`core.administration`、`core.docs`、`core.changelogs`、`core.license`、`core.error`、`gateway.study`、`gateway.study.child` です。外部モジュールと同じ `component-pages:request` 契約を使用し、Overlay または全画面の埋め込みに対応します。Login とデモ用エントリーは Dashboard Shell のコンポーネントページではないため利用対象外です。

## 移動およびサイズ変更が可能な PiP ウィンドウ

`pip` を宣言したサーフェスは、Cognis の再利用可能なフローティングウィンドウ動作で表示されます。各フローティングウィンドウには、上端のどこからでもドラッグできるホスト所有の細いツールバーと、左上隅および右下隅に表示される SVG リサイズハンドルがあります。Cognis はウィンドウを表示領域内に保ち、フォーカスセッション終了時にすべてのリスナーを解除します。プロバイダーモジュールは `pip` を宣言して提供されたルートへマウントするだけにし、競合するドキュメント全体のドラッグまたはリサイズハンドラーを追加してはいけません。

プロバイダーはサーフェスメタデータに `minSize: { width, height }` を含め、PiP の最小寸法をピクセル単位で宣言できます。両方の寸法は正の有限数でなければなりません。ホストはサイズ変更時に適用するため、それらをフローティングウィンドウコントローラーへ渡します。`minSize` を省略した場合はホストの既定値が使用されます。フローティングウィンドウを直接作成するプロバイダーは、返されたクリーンアップ関数の `release.updateMinimumSize({ width, height })` を呼び出せます。有効な更新では小さすぎるウィンドウが直ちに拡大され、利用可能な境界内に保たれます。無効な更新またはクリーンアップ後には `false` を返します。

ミーティングフレームなど独自の PiP 要素を所有するモジュールは、`uiCtx.capabilities` から `ui:makeFloatingWindow` を取得し、要素、ドラッグハンドル、ページシグナルを渡して、返されたクリーンアップ関数を保持します。このユーティリティを直接インポートしてはいけません。

Cognis は既存のプロバイダー要素を別の DOM 親へ移動せず、ブラウザーのトップレイヤーへ昇格させます。そのため、PiP を開閉しても動作中の iframe とミーティング接続が維持されます。トップレイヤー非対応のブラウザーでは要素を移動せず、元のコンポーネントステージ内に維持して親領域へ制限します。
