# 使用例

ガイド付きチュートリアル の実践的な操作手順です。

## 前提条件

操作の前に、[アクセスの要件](/docs/tutorials)を確認してください。

## 使用例

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

この例は ガイド付きチュートリアル の公開されたインターフェースを使います。書き込みを繰り返す前に、[技術情報](/docs/tutorials/technical)で説明する応答または保存された状態を確認してください。

## 問題の解決

ガイド付きチュートリアル を利用できない場合は、ログイン状態を確認し、コンポーネントと依存先の有効状態を管理者に確認してもらってください。
