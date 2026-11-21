# Anwendung

Praktische Abläufe für Geführte Anleitungen.

## Voraussetzungen

Melde dich für kontogebundenen Abschluss an; optionale Aktionen erscheinen nur bei Verfügbarkeit.

## Beispiele

Starte, folge Markierungen, nutze Zurück oder Weiter und schließe ab; wiederhole über denselben Kopfbereich.

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

Abschlüsse bleiben am Konto gespeichert; Wiederholung benötigt kein Zurücksetzen der Einstellungen.

## Fehlerbehebung

Prüfe aktive Seite und sichtbare Aktion. Schließen eines optionalen Dialogs kann zum Zweiganfang zurückführen.
