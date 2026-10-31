# Geführte Anleitungen

Im Kontomenü öffnet Anleitungen die aktuell zulässigen Abläufe installierter Komponenten und Module. Der Host besitzt Darstellung, Zielauflösung, Eingaberegeln und Sitzungssteuerung; die jeweilige Funktion besitzt Texte, Ziele und Skript. Anleitungen starten nicht automatisch und ändern keine Berechtigungen.

## Einen Ablauf registrieren

Browser-Anbieter verwenden `ui:tutorials` über ihren begrenzten ctx. Die Vertragsversion ist `1`. Ein Besitzer benötigt ein `AbortSignal`, das seine Registrierungen begrenzt.

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

Registrierungen erfolgen in `mountProvider`, niemals beim Import. Bei Fehlern werden Teilregistrierungen entfernt. Workspace und Study enthalten eigene Abläufe; die externe Modul-Testinstanz unter `src/ui/reuse/tutorials/tests/fixtures/` zeigt einen unabhängigen Verbraucher des öffentlichen Vertrags.

## Ziele und Übersetzungen

Ziele erhalten `owner:name`. Sie bleiben privat, außer sie werden mit `public: true` veröffentlicht. Andere Komponenten verwenden semantische IDs statt privater Selektoren. Doppelte Besitzer-, Ablauf- und Ziel-IDs werden abgelehnt. Resolver liefern genau ein Element des aktuellen Dokuments oder `null`, keine dauerhaft gespeicherten Seitenknoten. `root` begrenzt die Auflösung; ein zusätzliches `signal` kann die Lebensdauer verkürzen. Versteckte, inaktive und deaktivierte Ziele sind nicht verfügbar. Das Zurückziehen eines gerade verwendeten Ziels beendet die betroffene Sitzung.

Bei Ersetzung und während der Anzeige werden Ziele erneut aufgelöst. Offene Shadow-DOM-Ziele werden unterstützt, wenn der angegebene Wurzelbereich ihren Host enthält. Geschlossene Wurzeln und Frame-Inhalte sind ausgeschlossen. Eingebettete Elemente dürfen nicht Bestandteil eines blockierenden Ziels sein, weil der Host ihre Eingaben nicht kontrollieren kann. Portale benötigen einen ausdrücklich veröffentlichten Wurzelbereich desselben Dokuments.

`stringsBaseUrls` verwendet Host-Kataloge mit englischer Rückfallsprache. Katalog und erneuter Start lesen die aktuell angezeigte Sprache ohne Seitenaktualisierung. Alternativ ist `i18n` als Resolver oder asynchrone Resolver-Fabrik möglich. Fehlende notwendige Übersetzungen lassen Registrierung oder Operation scheitern. Texte werden nie als HTML interpretiert.

## Schrittoptionen

- `effects` schaltet `callout`, `arrow` und `spotlight` unabhängig. Standard: Text an, Pfeil und Hervorhebung aus. Visuell verborgene Erklärungen bleiben für Hilfstechnologien zugänglich; Fortschritt und Bedienung bleiben sichtbar.
- `placement`: `auto`, `top`, `bottom`, `left`, `right`; `padding`: 0–40 Pixel. Die Position folgt verschachteltem Scrollen, Größen- und Layoutänderungen sowie dem sichtbaren Viewport. Anfangs außerhalb liegende Ziele werden eingeblendet; späteres absichtliches Scrollen wird respektiert.
- `interaction`: `free` oder `target`. Die Sperre begrenzt Zeiger-, Touch- und Tastatureingaben auf Ziel und Anleitung. Sie aktiviert keine deaktivierten Elemente und ersetzt keine Autorisierung.
- `advance`: `click`, `change`, `input`, `submit` oder `keydown`, optional `key` und synchrones/asynchrones `accept(event)`. Wiederholte Eingabe schaltet nur einmal weiter; asynchrone Prüfungen müssen `true` liefern.
- `enter({ signal, target, stepId })` ist vertrauenswürdiger Vorbereitungscode und kann eine Bereinigungsfunktion zurückgeben. `waitFor` erhält denselben Kontext und schaltet nach Erfüllung weiter. Beide sind auf fünfzehn Sekunden begrenzt und folgen dem Schrittabbruch. Asynchrone Bereinigungsfehler werden protokolliert; eigene Arbeit soll das Signal beachten.
- `route` ist ein interner Pfad ohne Abfragedaten oder ein vertrauenswürdiger Callback dafür. `ui:navigate` erhält Autorisierung, Offline-Regeln und Schutz ungespeicherter Änderungen. Study löst eigene Pfade über `study:tutorialTargets.route({ language, area })` mit `overview`, `explore` oder `flashcards` auf.
- `missing` enthält `timeoutMs` von 0 bis 15000, standardmäßig 5000, und `action`: `cancel`, `skip` oder `retry`. Skip überspringt den fehlenden Schritt, Retry zeigt einen ausdrücklichen Wiederholungsbutton. Warten sperrt die Seite nicht.

Definitionen benötigen Version 1, eindeutige Schritt-IDs, übersetzte Titel und höchstens 100 Schritte. Unbekannte Versionen, Felder und ungültige Optionen werden abgelehnt. Callbacks sind vertrauenswürdiger Komponentencode; heruntergeladene Skripttexte dürfen nicht ausgewertet werden.

## Sitzungen und Flows

`await owner.register(play)` liefert `{ id, start, dispose }`. `await tutorials.list()` liest den zulässigen Katalog; `openCatalog()` verwendet das vorhandene Entscheidungs-Popup und bündelt wiederholte Anfragen. `await tutorials.start(id)` oder `start()` liefert `ready`, `finished`, `state()`, `next()`, `back()`, `retry()`, `skip()`, `cancel()` und `dispose()`. `current()` ist eine schreibgeschützte Momentaufnahme. Skip beendet den gesamten Ablauf; Abbruch und Bereinigung sind idempotent.

Es gibt nur eine aktive Sitzung. Ein konkurrierender Start scheitert, außer `{ replace: true }` beendet ausdrücklich die alte Sitzung. Registrierung, Zielveröffentlichung, Katalog, Start und Schrittaktionen verwenden `ui:tutorial:<action>` mit `validate`, `execute`, `after`. Verbraucher dürfen diese Verträge nicht umgehen.

Andere Navigation, Browser-Zurück/Vorwärts, Escape, Berechtigungsverlust, Besitzerentfernung und notwendige Popups beenden die Sitzung. Ausdrückliche Routenschritte dürfen nach angenommener SPA-Navigation fortfahren. Ausstehende Navigation besitzt sichtbare Abbruchkontrollen. Anleitungen bestätigen keine Dialoge, senden keine privilegierten Formulare und starten keine Anrufe. Pflichtdialoge behalten Vorrang und ihre Schließregeln.

Am Ende werden Host-Overlays, Listener, Beobachter, Timer und Zielwartezeiten entfernt und der Fokus passend wiederhergestellt. Späte Callbacks können keine alten Schritte zurückbringen. Deaktivierung, Deinstallation, Aktualisierung und fehlgeschlagenes Mounten entfernen eigene Definitionen und betroffene Sitzungen. Fortschritt wird nicht gespeichert; Erweiterungen können `cognis:tutorial-presented` und `cognis:tutorial-finish` beobachten.
