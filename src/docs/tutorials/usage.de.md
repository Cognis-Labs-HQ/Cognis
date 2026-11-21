# Anwendung

Praktische Abläufe für Geführte Anleitungen.

## Voraussetzungen

Beachten Sie vor dem Ausführen [die Zugriffsanforderungen](/docs/tutorials).

## Beispiele

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

## Erwartete Ergebnisse

Das Beispiel verwendet die dokumentierte Schnittstelle von Geführte Anleitungen. Prüfen Sie vor erneuten Schreibvorgängen die unter [Technik](/docs/tutorials/technical) beschriebene Antwort oder den gespeicherten Zustand.

## Fehlerbehebung

Falls Geführte Anleitungen nicht verfügbar ist, prüfen Sie Ihre Anmeldung und lassen Sie den Administrator die Komponente und ihre Abhängigkeiten kontrollieren.
