# ガイド付きチュートリアル

アカウントメニューのチュートリアルには、インストール済みコンポーネントやモジュールのうち現在利用できるガイドを表示します。ホストは表示、対象の解決、入力制御、セッション調整を担当し、各機能が文章、対象、スクリプトを所有します。自動実行や権限の変更は行いません。

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

`await owner.register(play)` は `{ id, start, dispose }` を返します。`await tutorials.list()` は利用可能なカタログを読み、`openCatalog()` は既存の選択ポップアップを使って重複要求をまとめます。`await tutorials.start(id)` または `start()` が返すセッションには `ready`、`finished`、`state()`、`next()`、`back()`、`retry()`、`skip()`、`cancel()`、`dispose()` があります。`current()` は読み取り専用の状態です。Skip はガイド全体を終了し、中止と解除は冪等です。

同時に有効なセッションは一つだけです。競合する開始は拒否し、明示的な `{ replace: true }` の場合だけ以前のセッションを中止します。登録、対象公開、カタログ、開始、ステップ操作は `validate`、`execute`、`after` を持つ `ui:tutorial:<action>` フローで実行します。利用側はこれらの契約を迂回しません。

関係のない移動、ブラウザーの戻る・進む、Escape、権限の喪失、所有者の解除、必要なポップアップでセッションを終了します。明示的なルートステップは承認された SPA 移動を継続できます。移動の待機中にも中止操作を表示します。ガイドが確認ダイアログを承認したり、特権の必要なフォームを送信したり、通話を始めたりすることはありません。必須ダイアログの優先順位と終了条件を維持します。

終了時にはホストのオーバーレイ、リスナー、監視、タイマー、対象の待機を解除し、適切な場合にフォーカスを戻します。遅延した処理から古いステップを復活させません。無効化、アンインストール、更新、プロバイダーのマウント失敗は所有する定義と対象セッションを解除します。進捗は保存せず、必要なら `cognis:tutorial-presented` と `cognis:tutorial-finish` を監視できます。
