# Geführte Anleitungen

Anleitungen gehören zu einer Seite oder URL. Beim ersten zulässigen Besuch starten die noch nicht abgeschlossenen Anleitungen automatisch. Ein Fragezeichen-SVG neben dem Titel in `page-context` wiederholt die verfügbaren Anleitungen dieser Seite. Der Host besitzt Darstellung und Lebenszyklus; die Funktion besitzt Texte, Ziele und Skript. Berechtigungen werden nie geändert.

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

Registrierungen erfolgen in `mountProvider`, niemals beim Import. Bei Fehlern werden Teilregistrierungen entfernt. Workspace und Study enthalten eigene Abläufe; die externe Modul-Testinstanz unter `src/ui/reuse/tutorials/tests/fixtures/` zeigt einen unabhängigen Verbraucher des öffentlichen Vertrags.

## Seitenbindung und erster Besuch

Jeder Ablauf benötigt `page`: einen genauen Pfad wie `/dashboard` oder ein vertrauenswürdiges synchrones Prädikat `({ pathname }) => boolean` für mehrere URLs oder eine seitenspezifische Bedingung. Die Bindung ist unabhängig von der Schrittnavigation. Starts außerhalb der Bindung werden abgelehnt. Registrierung, Seitenwechsel, Kontowechsel und geschlossene Popups aktualisieren die Erkennung. Entfernte Anbieter ziehen ihre Hilfeaktion zurück. Pflichtdialoge verschieben den automatischen Start.

Study bietet `study:tutorialTargets.matchesPage({ pathname, language })`, damit Sprachanbieter ihre Anleitung ohne kopierte Host-Routenregeln an Explore- und Flashcards-Seiten binden. Der Composer veröffentlicht abgeschlossene Seitenaufbauten über `page:mounted` (`publish`).

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

`await owner.register(play)` liefert `{ id, start, dispose }`. `await tutorials.list({ page: { pathname } })` liest zulässige Abläufe dieser Seite. `refreshPage()` aktualisiert die Erkennung; `openPage()` startet den einzigen passenden Ablauf oder bietet die Auswahl im gemeinsamen schwebenden Menü an. `start()` liefert `ready`, `finished`, `state()`, `next()`, `back()`, `retry()`, `skip()`, `cancel()` und `dispose()`. `current()` liefert eine schreibgeschützte Momentaufnahme.

Es gibt nur eine aktive Sitzung. Ein konkurrierender Start scheitert, außer `{ replace: true }` beendet ausdrücklich die alte Sitzung. Registrierung, Ziele, Erkennung, Seiteneintritt, Wiederholung, Start und Schrittaktionen verwenden `ui:tutorial:<action>` mit `validate`, `execute` und `after`. Verbraucher dürfen diese Verträge nicht umgehen.

Alle Aktionsbuttons stehen in einer eigenen Instanz des gemeinsamen schwebenden Menüs. Erstdurchläufe haben weder Abbrechen noch Überspringen; Escape beendet sie nicht. Weiter bleibt während Zielsuche, asynchroner Arbeit und ereignisgesteuerter Schritte verfügbar, sodass wiederholtes Weiter immer zum Ende führt. Wiederholungen bieten Abbrechen mit `btn-cancel`. Andere Navigation, Verlauf, Konto- oder Berechtigungsverlust, entfernte Anbieter und Pflichtdialoge räumen weiterhin jede Sitzung auf. Anleitungen bestätigen keine Dialoge, senden keine privilegierten Formulare und starten keine Anrufe.

Abschluss und Abbruch entfernen Overlays, schwebende Menüs, Listener, Beobachter und ausstehende Arbeit und stellen den Fokus passend wieder her. Späte Callbacks beleben keine alten Schritte. Abgeschlossene Tutorial-IDs werden in diesem Browser getrennt nach Konto gespeichert. Unterbrochene oder fehlgeschlagene Erstdurchläufe bleiben beim nächsten Besuch verfügbar; Fehler starten keine Schleife auf der aktuellen Seite. Gelöschter Browserspeicher setzt die Erkennung zurück. Verbraucher können `cognis:tutorial-presented` und `cognis:tutorial-finish` beobachten.

## Komponenteneigene Anleitungen

Seiten übergeben verfasste Beiträge im Composer-Feld `tutorials`. Jeder Beitrag erklärt Besitzer, Definitionen und optional `minRole`; jede Definition liefert Seite, übersetzte Texte und komponenteneigene Selektoren. `scope` beschränkt die Erkennung auf einen sichtbaren Bereich. Der Host veröffentlicht begrenzte Ziele und registriert über `ui:tutorial:mountPage`. Beim Entfernen der Seite werden ihre Anleitungen bereinigt. Optionale Anbieter können `mountTutorialProvider` aus `ui:reuse` verwenden und Übersetzungen sowie Lebenszyklus selbst besitzen.

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

[Tutorial-Abdeckung](/docs/tutorials-coverage)

## Anleitungskataloge

Die Sprachkataloge der Anleitungen werden mit einer Revision ihrer deklarierten Übersetzungsschlüssel geladen, getrennt von früher geladenen Seitenkatalogen. So verhindert ein älterer Katalog im Arbeitsspeicher nicht die Registrierung neuer Anleitungstexte. Unveränderte Anleitungen verwenden den Katalog erneut, auch offline. Fehlende Texte der bevorzugten Sprache werden aus Englisch ergänzt. Fehlen auch englische Schlüssel, schlägt die Registrierung weiterhin fehl und nimmt den Anbieter zurück. Schrittschlüssel benennen ihr Thema statt ihrer Position.

## Sichtbare Hervorhebung

Hervorhebungen verwenden den sichtbaren Schnittbereich des Ziels, seiner abschneidenden oder scrollenden Vorfahren und des sichtbaren Ansichtsfensters. Seitenziele meiden Kopf- und Fußzeile; Anleitungen für diese Bedienelemente nutzen weiterhin deren eigenen Bereich. Bereits sichtbare übergroße Ziele behalten ihre Scrollposition. Hinweisfelder versuchen freie Seiten, bevor sie im sichtbaren Ziel erscheinen; irreführende Pfeile außerhalb des Bildes werden dann ausgeblendet. Die Tutorialsteuerung reserviert eigenen Platz, sodass lange Übersetzungen scrollbar bleiben und keine Navigationsschaltflächen verdecken.

Das unabhängige gemeinsame schwebende Menü erhält eine deckende themenabhängige Fläche, Akzentrahmen und Schatten oberhalb der Abdunklung, unabhängig von der Ladereihenfolge der Stylesheets. Weiter und Abschließen sind kontrastreicher. Umbrechende Bedienelemente bleiben in hellen und dunklen Themen im Ansichtsfenster. Die Abbruchregeln für erste Besuche und Wiederholungen bleiben unverändert.
