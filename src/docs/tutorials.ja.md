# ガイド付きチュートリアル

チュートリアルはページや URL に紐付きます。利用条件を満たす初回訪問では、そのページの未完了ガイドを自動的に開始します。`page-context` のタイトル横にある疑問符 SVG から、そのページで利用できるガイドを再生できます。ホストは表示と寿命を管理し、各機能が文章、対象、スクリプトを所有します。権限は変更しません。

## ガイドの登録

ブラウザープロバイダーはスコープ付き ctx から `ui:tutorials` を使用します。契約のバージョンは `1` です。所有者の登録には、寿命を制限する `AbortSignal` が必要です。

```js
export async function mountProvider(ctx) {
    const tutorials = ctx.capabilities.get("ui:tutorials");
    if (tutorials?.version !== 1)
        throw new Error("tutorial_contract_unavailable");
    const owner = tutorials.owner("module.example", {
        signal: ctx.signal,
        stringsBaseUrls: ["/static/modules/example/languages"],
    });
    try {
        const target = await owner.target("primary", {
            root: () => document.querySelector(".example-panel"),
            resolve: () =>
                document.querySelector(".example-panel [data-example-primary]"),
        });
        const play = await owner.register({
            version: 1,
            page: "/example",
            id: "introduction",
            titleKey: "module.example.tutorial.title",
            steps: [
                {
                    id: "primary",
                    target: target.id,
                    titleKey: "module.example.tutorial.primary.title",
                    bodyKey: "module.example.tutorial.primary.body",
                    effects: { callout: true, arrow: true, spotlight: true },
                    interaction: "target",
                    advance: { event: "click" },
                },
            ],
        });
        ctx.capabilities.contribute("example:tutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
```

登録はインポート時ではなく `mountProvider` で行います。`owner.dispose` を返し、失敗時には途中の登録を解除します。Workspace と Study は組み込みガイドを提供します。`src/ui/reuse/tutorials/tests/fixtures/` の外部モジュール用フィクスチャは、公開契約を使う独立した利用例です。

## ページの紐付けと初回訪問

すべてのガイドに `page` が必要です。`/dashboard` などの正確なパス、または複数の URL やページ固有条件を判定する信頼された同期関数 `({ pathname }) => boolean` を指定します。ステップ内の移動とは別の設定です。対象外での開始は拒否します。登録、ページ表示、アカウント変更、ポップアップの終了時に再判定し、解除されたプロバイダーのヘルプ操作も削除します。必須ダイアログの表示中は自動開始を待ちます。

Study は `study:tutorialTargets.matchesPage({ pathname, language })` を公開し、言語プロバイダーがホストのルート規則を複製せずに Explore と Flashcards のページへガイドを紐付けられます。コンポーザーはページ表示の完了を `page:mounted` の `publish` ステージで公開します。

## 対象と翻訳

対象名は `owner:name` になります。明示的に `public: true` を指定しない限り非公開で、他のコンポーネントは私有セレクターではなく公開された意味的 ID を使います。所有者、ガイド、対象の重複 ID は拒否します。リゾルバーは現在の文書の要素一つか `null` を返し、ページのノードを永続保持しません。`root` は解決範囲を制限し、追加の `signal` は寿命を短縮できます。非表示、inert、無効な対象は利用できません。使用中の対象を撤回すると、そのセッションを終了します。

要素の置換後や表示中も対象を再解決します。指定範囲にホストが含まれる場合、開いた Shadow DOM の対象を利用できます。閉じたルートとフレーム内部は対象外です。埋め込み要素を含む対象では入力制御を保証できないため、ブロックモードを使用できません。ポータルには同じ文書内で明示的に公開されたルートが必要です。

`stringsBaseUrls` はホストの翻訳カタログと英語へのフォールバックを使用します。カタログと再実行はページを更新せず現在の表示言語を解決します。代わりに、リゾルバーまたは非同期リゾルバー生成関数を `i18n` で渡せます。必要な翻訳が欠けている場合、登録または操作を失敗させます。文章を HTML として解釈することはありません。

## ステップの設定

- `effects` の `callout`、`arrow`、`spotlight` は独立して指定できます。既定では文章だけを表示します。視覚的に隠した説明も支援技術では利用でき、操作と進捗は常に残ります。
- `placement` は `auto`、`top`、`bottom`、`left`、`right`、`padding` は 0～40 ピクセルです。入れ子のスクロール、サイズ・レイアウト変更、視覚ビューポートに追従します。開始時に画面外の対象を表示しますが、その後の意図的なスクロールは妨げません。
- `interaction`: 説明用の既定値 `none`、`free`、`target` を指定します。`none` は強調領域を覆い、ページ操作や JavaScript のホバー処理を防ぎます。チュートリアルの操作は使えます。`target` は対象内とガイドのポインター・タッチ・キーボード操作を許可します。`advance` があるステップの既定値は `target` です。`none` では操作イベントを要求できません。
- `suppressHover`: 操作ステップに指定できる任意の真偽値です。`interaction: "target"` と true を指定すると、対象のクリックとキーボード操作を許可しつつ JavaScript のホバー処理を防ぎます。通知とアカウントのボタンで使い、他のページ操作は引き続き制限します。
- `layer`: 既定値の `page`、または検索画面など一時的な領域を案内する `overlay` を指定します。必須の確認ダイアログは引き続きガイドを終了させます。`enter` と `waitFor` にはステップをまたいで有効な `sessionSignal` も渡され、完了・中止・提供元の解除時に終了します。
- `group`: 一時的な画面を共有する連続したステップに付ける任意の意味的な識別子です。`enter` と `waitFor` には `groupSignal` が渡され、グループを離れる前、セッション終了時、グループの最初へ戻った時に終了します。検索をこの期間に結び付けると、閉じるステップを飛ばしてもアカウントの案内に進む前に検索を終了できます。
- `preventNavigation`: ステップ中のリンク操作とルーターによる移動を防ぐ任意の真偽値です。ルーターが管理する履歴移動も対象で、既定値は false です。ガイド自身の `route` 移動は許可します。ステップ移行や破棄時に解除します。ダッシュボードのガイドでは、ナビゲーションの強調中に別ページへ移動しないよう有効にします。
- `advance` は `click`、`change`、`input`、`submit`、`keydown` に対応し、任意の `key` と同期・非同期の `accept(event)` を指定できます。連続入力でも進むのは一度です。非同期の判定は `true` を返す必要があります。
- `enter({ signal, target, stepId })` は信頼された準備処理で、解除関数を返せます。`waitFor` は同じ引数を受け取り、完了すると次へ進みます。両方とも十五秒で制限され、ステップの中止に従います。非同期の解除エラーは記録し、所有する非同期処理には signal を使用します。
- `route` はクエリを含まない内部パス、またはそのパスを解決する信頼された関数です。`ui:navigate` により認可、オフライン制約、未保存変更の保護を維持します。Study のパスは `study:tutorialTargets.route({ language, area })` が解決し、area は `overview`、`explore`、`flashcards` です。
- `missing` は `timeoutMs` を 0～15000（既定 5000）、`action` を `cancel`、`skip`、`retry` で指定します。Skip は欠けたステップを飛ばし、Retry は明示的な再試行ボタンを表示します。待機中にページをロックしません。

定義にはバージョン 1、一意なステップ ID、翻訳されたタイトルが必要で、最大 100 ステップです。未対応のバージョン、フィールド、不正な設定は拒否します。コールバックは信頼されたコンポーネントコードです。ダウンロードしたスクリプト文字列を評価してはいけません。

## セッションとフロー

`await owner.register(play)` は `{ id, start, dispose }` を返します。`await tutorials.list({ page: { pathname } })` はそのページで利用可能なガイドを取得します。`refreshPage()` は再判定し、`openPage()` は唯一のガイドを開始するか、共通のフローティングメニューに候補を表示します。`start()` が返すセッションには `ready`、`finished`、`state()`、`next()`、`back()`、`retry()`、`skip()`、`cancel()`、`dispose()` があります。`current()` は読み取り専用の状態です。

有効なセッションは一つだけです。競合する開始は拒否し、明示的な `{ replace: true }` の場合だけ前のセッションを中止します。登録、対象、検索、ページ訪問、再生、開始、ステップ操作は `validate`、`execute`、`after` を持つ `ui:tutorial:<action>` フローで実行します。利用側は契約を迂回しません。

操作ボタンはすべて、共通のフローティングメニューの独立したインスタンスに表示します。初回は中止とスキップを表示せず、Escape でも終了しません。対象の待機中、非同期処理中、イベント待ちでも「次へ」が有効なので、繰り返し押せば最後まで進めます。再生時の中止ボタンには `btn-cancel` を使います。無関係な移動、履歴操作、アカウントや権限の喪失、所有者の解除、必須ダイアログでは引き続きセッションを解除します。確認の承認、特権フォームの送信、通話開始は行いません。

完了と中止はオーバーレイ、フローティングメニュー、リスナー、監視、未完了処理を解除し、適切な場合にフォーカスを戻します。遅延した処理から古いステップを復活させません。完了したガイドの ID は、このブラウザー内でアカウント別に保存します。中断や失敗した初回は次の訪問時に再実行できますが、現在のページで失敗を自動的に繰り返しません。ブラウザーの保存内容を消すと未実行になります。`cognis:tutorial-presented` と `cognis:tutorial-finish` を監視できます。

## コンポーネントが所有するガイド

ページはコンポーザーの `tutorials` 配列でガイドを提供します。各提供元は所有者、定義、必要に応じて `minRole` を指定し、定義には対象ページ、翻訳済みの文章、コンポーネントが所有するセレクターを含めます。`scope` は表示中の領域に判定を限定します。ホストは寿命を限定した対象を公開し、`ui:tutorial:mountPage` で登録します。ページの解除時にはガイドも解除します。任意コンポーネントのプロバイダーは `ui:reuse` の `mountTutorialProvider` を使い、翻訳と寿命を自身で管理できます。

```js
createPageComposer(root, {
    signal,
    i18n,
    pageContext,
    elements,
    tutorials: [
        {
            owner: "example.page",
            minRole: "admin",
            definitions: [
                {
                    id: "review",
                    page: "/example",
                    scope: ".example-panel",
                    titleKey: "example.tutorial.title",
                    steps: [
                        {
                            id: "options",
                            selector: ".example-options",
                            titleKey: "example.tutorial.options.title",
                            bodyKey: "example.tutorial.options.body",
                        },
                    ],
                },
            ],
        },
    ],
});
```

[チュートリアルの対応範囲](/docs/tutorials-coverage)

## チュートリアルの翻訳カタログ

チュートリアルの翻訳カタログは、宣言した翻訳キーに基づくリビジョンで読み込み、先に読み込んだページのカタログと分けて管理します。これにより、メモリ内の古いカタログが新しい説明文の登録を妨げることを防ぎます。同じガイドのカタログは、オフラインでも再利用します。優先言語の文言がない場合は英語を使い、英語のキーもない場合は登録に失敗して所有者の登録を取り消します。手順のキーには順番ではなく内容を表す名前を使います。

## 見えている範囲の強調

強調表示は、対象、スクロールや切り抜きを行う祖先要素、表示中のビューポートが重なる範囲を使います。ページ内の対象はヘッダーとフッターを避け、それらの操作部分を案内する場合は本来の範囲を使います。大きな対象が既に見えている場合はスクロール位置を維持します。説明は空いている側を優先し、配置できなければ見えている対象内に置きます。その場合、画面外を指す紛らわしい矢印は表示しません。操作メニューの領域を別に確保し、長い翻訳文もナビゲーションボタンを覆わずにスクロールできます。

独立した共通フローティングメニューは、標準のテーマ、枠、ボタン、余白、背景ぼかしをそのまま使います。ページ見出しから開く再生選択メニューも含め、チュートリアルの暗幕より上に表示します。暗幕は強調対象、フローティング操作項目、ブロードキャストバナーを除外し、説明パネルは表示中のバナーの下に配置します。明暗どちらのテーマでも操作項目を画面内に収めます。

説明は利用できる操作や作業に絞り、権限やガイドが実行しない操作についての不要な説明を省きます。

## ページの準備完了

ホストは `page:mounted` の後に、`prepare`、`blocking`、`ready`、`afterReady` の各段階を持つ `page:ready` を実行します。描画は完了させ、ブロック段階で起動時の処理を待ちます。遅延したログイン設定をリリースノートより先に処理します。変更履歴の所有元は設定、メタデータの取得、ポップアップが閉じられるまで待ってから準備完了を公開します。キャンセルされた古いポップアップは既読を保存せず閉じます。自動チュートリアルとページ見出しからの再生は準備完了まで延期します。移動時には旧ページを無効にし、古い処理が新しいページを準備完了にすることを防ぎます。

今後のポップアップの所有元は、ページのマウント前に共通の `page-readiness.js` の `registerPageReadinessBlocker` で処理を登録できます。所有元固有の `id`、任意の `order`、所有元の `signal` を指定し、確認やポップアップの終了まで待つ Promise を返します。コールバックの `input.signal` はページと所有元のキャンセルを統合します。登録の置換と終了処理も所有元の寿命に従います。通知などの後続処理は `ui:pageReadiness.isReady()` または `afterReady` 段階で実行を延期できます。

## ダッシュボードのパネルと操作

ダッシュボードのガイドは18ステップになり、実際のクリック処理で通知パネルとアカウントメニューを開きます。クリック練習中はホバーを防ぎ、パネルやメニューの説明中は削除やページ移動を行う操作を無効にします。設定、ドキュメント、役割に応じた管理リンク、ログアウトを説明し、ページ操作ドックの言語切り替え、表示、レイアウト編集も案内します。

一時的な画面は `ui:transientSurfaces.register(element, close, signal)` で要素、閉じる処理、所有元の期間を登録します。ガイドは `attachLifetime(element, groupSignal)` を使い、グループ終了時に対応する検索、通知パネル、メニューだけを閉じます。ガイドのボタン操作は背景の外側クリック処理に伝わらないため、説明中もメニューを開いたままにできます。

`missing.action: "skip"` を指定した操作項目がない場合、初回でも再生時でも飛ばします。役割によって非表示になっているメニュー項目も対象です。
