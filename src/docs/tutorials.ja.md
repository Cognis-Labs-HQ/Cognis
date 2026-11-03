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
- `interaction` は `free` または `target` です。ブロックモードではポインター、タッチ、キーボード操作を対象とガイドの操作部に制限します。無効な操作の有効化や認可の代替は行いません。
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
