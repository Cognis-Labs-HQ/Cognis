# 使用例

ガイド付きチュートリアル の実践的な操作手順です。

## 前提条件

完了状態はログイン中のアカウントに保存し、任意の操作は利用可能な場合だけ表示します。

## 使用例

強調された操作を進め、必要なら戻る・次へを使って完了します。同じ操作から再生できます。

```ts
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
                    highlightNext: false,
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

## 期待される結果

完了はアカウントに保持され、再生に設定の初期化は不要です。

## 問題の解決

現在の画面と操作の表示を確認してください。任意のダイアログを閉じると分岐の開始に戻る場合があります。
