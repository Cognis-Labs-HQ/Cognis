# Geführte Anleitungen

Anleitungen gehören zu einer Seite oder sichtbaren Ansicht. Beim ersten berechtigten Besuch startet eine ungesehene Anleitung automatisch. Das Fragezeichen neben dem Seitentitel öffnet verfügbare Anleitungen erneut. Der Host besitzt Darstellung und Lebenszyklus; jedes Feature besitzt Texte, Ziele und Ablauf.

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

Registrierungen erfolgen in `mountProvider`, niemals beim Import. Bei Fehlern werden Teilregistrierungen entfernt. Workspace und Study enthalten eigene Abläufe; die externe Modul-Testinstanz unter `src/ui/reuse/tutorials/tests/fixtures/` zeigt einen unabhängigen Verbraucher des öffentlichen Vertrags.

## Seitenbindung und erster Besuch

Jeder Ablauf benötigt `page`: einen genauen Pfad wie `/dashboard` oder ein vertrauenswürdiges synchrones Prädikat `({ pathname }) => boolean` für mehrere URLs oder eine seitenspezifische Bedingung. Die Bindung ist unabhängig von der Schrittnavigation. Starts außerhalb der Bindung werden abgelehnt. Registrierung, Seitenwechsel, Kontowechsel und geschlossene Popups aktualisieren die Erkennung. Entfernte Anbieter ziehen ihre Hilfeaktion zurück. Pflichtdialoge verschieben den automatischen Start.

Study stellt `study:tutorialTargets.matchesPage({ pathname, language })` für Spracheinführungen auf der Übersicht bereit. Aktivitätsanleitungen gehören zur aktuellen Host-Ansicht. Ein Wechsel von Kana zu Kanji darf weder eine Spracheinführung starten noch zur Übersicht zurückführen. Der Composer meldet fertige Montagen über `page:mounted` (`publish`).

## Ziele und Übersetzungen

Ziele erhalten `owner:name`. Sie bleiben privat, außer sie werden mit `public: true` veröffentlicht. Andere Komponenten verwenden semantische IDs statt privater Selektoren. Doppelte Besitzer-, Ablauf- und Ziel-IDs werden abgelehnt. Resolver liefern genau ein Element des aktuellen Dokuments oder `null`, keine dauerhaft gespeicherten Seitenknoten. `root` begrenzt die Auflösung; ein zusätzliches `signal` kann die Lebensdauer verkürzen. Versteckte, inaktive und deaktivierte Ziele sind nicht verfügbar. Das Zurückziehen eines gerade verwendeten Ziels beendet die betroffene Sitzung.

Bei Ersetzung und während der Anzeige werden Ziele erneut aufgelöst. Offene Shadow-DOM-Ziele werden unterstützt, wenn der angegebene Wurzelbereich ihren Host enthält. Geschlossene Wurzeln und Frame-Inhalte sind ausgeschlossen. Eingebettete Elemente dürfen nicht Bestandteil eines blockierenden Ziels sein, weil der Host ihre Eingaben nicht kontrollieren kann. Portale benötigen einen ausdrücklich veröffentlichten Wurzelbereich desselben Dokuments.

`stringsBaseUrls` verwendet Host-Kataloge mit englischer Rückfallsprache. Katalog und erneuter Start lesen die aktuell angezeigte Sprache ohne Seitenaktualisierung. Alternativ ist `i18n` als Resolver oder asynchrone Resolver-Fabrik möglich. Fehlende notwendige Übersetzungen lassen Registrierung oder Operation scheitern. Texte werden nie als HTML interpretiert.

## Schrittoptionen

- `effects` schaltet `callout`, `arrow` und `spotlight` unabhängig. Standard: Text an, Pfeil und Hervorhebung aus. Visuell verborgene Erklärungen bleiben für Hilfstechnologien zugänglich; Fortschritt und Bedienung bleiben sichtbar.
- `placement`: `auto`, `top`, `bottom`, `left`, `right`; `padding`: 0–40 Pixel. Die Position folgt verschachteltem Scrollen, Größen- und Layoutänderungen sowie dem sichtbaren Viewport. Anfangs außerhalb liegende Ziele werden eingeblendet; späteres absichtliches Scrollen wird respektiert.
- `interaction`: `none` (Standard für Erklärungen), `free` oder `target`. `none` schirmt den hervorgehobenen Bereich ab und sperrt Seitenaktivierung sowie JavaScript-Hover-Ereignisse; die Tutorialsteuerung bleibt verfügbar. `target` erlaubt Zeiger-, Touch- und Tastatureingaben im Ziel und in der Tutorialsteuerung. Schritte mit `advance` verwenden standardmäßig `target`; `none` darf kein Interaktionsereignis verlangen.
- `suppressHover`: optionaler boolescher Wert für interaktive Schritte. Zusammen mit `interaction: "target"` erlaubt true Klick- und Tastaturaktivierung des Ziels, unterdrückt aber JavaScript-Hover-Handler. Die Öffner für Benachrichtigungen und Kontomenü nutzen dies; andere Seiteninteraktionen bleiben gesperrt.
- `layer`: `page` (Standard) oder `overlay` für gezielt erklärte vorübergehende Oberflächen wie die Suche. Erforderliche Entscheidungsdialoge beenden weiterhin die Sitzung. `enter` und `waitFor` erhalten außerdem `sessionSignal`, das über Schritte hinweg aktiv bleibt und bei Abschluss, Abbruch oder Anbieterfreigabe abbricht.
- `group`: ein optionaler semantischer Bezeichner für benachbarte Schritte mit einer gemeinsamen vorübergehenden Oberfläche. `enter` und `waitFor` erhalten `groupSignal`; es bricht vor dem Verlassen der Gruppe, bei Sitzungsende und bei Rückkehr zum ersten Gruppenschritt ab. Binden Sie die Suche daran, damit auch ein übersprungener Schließen-Schritt die Suche vor der Kontoanleitung freigibt.
- `preventNavigation`: Ein optionaler boolescher Wert sperrt Linkaktivierung und Router-Navigation während des Schritts, einschließlich vom Router verwalteter Verlaufsschritte. Standard ist false. Eigene `route`-Wechsel der Anleitung bleiben möglich. Weiterschalten und Freigabe entfernen die Sperre. Die Dashboard-Anleitung aktiviert sie, damit die hervorgehobene Navigation nicht von der Seite wegführt.
- `advance`: `click`, `change`, `input`, `submit` oder `keydown`, optional `key` und synchrones/asynchrones `accept(event)`. Wiederholte Eingabe schaltet nur einmal weiter; asynchrone Prüfungen müssen `true` liefern.
- `enter({ signal, target, stepId })` ist vertrauenswürdiger Vorbereitungscode und kann eine Bereinigungsfunktion zurückgeben. `waitFor` erhält denselben Kontext und schaltet nach Erfüllung weiter. Beide sind auf fünfzehn Sekunden begrenzt und folgen dem Schrittabbruch. Asynchrone Bereinigungsfehler werden protokolliert; eigene Arbeit soll das Signal beachten.
- `route` ist ein interner Pfad ohne Abfragedaten oder ein vertrauenswürdiger Callback dafür. `ui:navigate` erhält Autorisierung, Offline-Regeln und Schutz ungespeicherter Änderungen. Study löst eigene Pfade über `study:tutorialTargets.route({ language, area })` mit `overview`, `explore` oder `flashcards` auf.
- `missing` enthält `timeoutMs` von 0 bis 15000, standardmäßig 5000, und `action`: `cancel`, `skip` oder `retry`. Skip überspringt den fehlenden Schritt, Retry belässt die Ansicht mit Tutorial neu starten und Weiter. Warten sperrt die Seite nicht.

Definitionen benötigen Version 1, eindeutige Schritt-IDs, übersetzte Titel und höchstens 100 Schritte. Unbekannte Versionen, Felder und ungültige Optionen werden abgelehnt. Callbacks sind vertrauenswürdiger Komponentencode; heruntergeladene Skripttexte dürfen nicht ausgewertet werden.

## Sitzungen und Flows

`await owner.register(play)` liefert `{ id, start, dispose }`. `await tutorials.list({ page: { pathname } })` liest zulässige Abläufe dieser Seite. `refreshPage()` aktualisiert die Erkennung; `openPage()` startet den einzigen passenden Ablauf oder bietet die Auswahl im gemeinsamen schwebenden Menü an. `start()` liefert `ready`, `finished`, `state()`, `next()`, `back()`, `restart()`, `retry()`, `skip()`, `cancel()` und `dispose()`. `current()` liefert eine schreibgeschützte Momentaufnahme.

Es gibt nur eine aktive Sitzung. Ein konkurrierender Start scheitert, außer `{ replace: true }` beendet ausdrücklich die alte Sitzung. Registrierung, Ziele, Erkennung, Seiteneintritt, Wiederholung, Start und Schrittaktionen verwenden `ui:tutorial:<action>` mit `validate`, `execute` und `after`. Verbraucher dürfen diese Verträge nicht umgehen.

Alle Aktionsbuttons stehen in einer eigenen Instanz des gemeinsamen schwebenden Menüs. Erstdurchläufe haben weder Abbrechen noch Überspringen; Escape beendet sie nicht. Weiter bleibt während Zielsuche, asynchroner Arbeit und ereignisgesteuerter Schritte verfügbar, sodass wiederholtes Weiter immer zum Ende führt. Wiederholungen verwenden Überspringen zum Beenden. Andere Navigation, Verlauf, Konto- oder Berechtigungsverlust, entfernte Anbieter und Pflichtdialoge räumen weiterhin jede Sitzung auf. Anleitungen bestätigen keine Dialoge, senden keine privilegierten Formulare und starten keine Anrufe.

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
                            highlightNext: true,
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

Dokumentieren Sie Seiten und Zugriffsrechte in der bestehenden Dokumentation der jeweiligen Komponente, ohne separate Gesamtübersicht.

## Anleitungskataloge

Die Sprachkataloge der Anleitungen werden mit einer Revision ihrer deklarierten Übersetzungsschlüssel geladen, getrennt von früher geladenen Seitenkatalogen. So verhindert ein älterer Katalog im Arbeitsspeicher nicht die Registrierung neuer Anleitungstexte. Unveränderte Anleitungen verwenden den Katalog erneut, auch offline. Fehlende Texte der bevorzugten Sprache werden aus Englisch ergänzt. Fehlen auch englische Schlüssel, schlägt die Registrierung weiterhin fehl und nimmt den Anbieter zurück. Schrittschlüssel benennen ihr Thema statt ihrer Position.

## Sichtbare Hervorhebung

Hervorhebungen verwenden den sichtbaren Schnittbereich des Ziels, seiner abschneidenden oder scrollenden Vorfahren und des sichtbaren Ansichtsfensters. Seitenziele meiden Kopf- und Fußzeile; Anleitungen für diese Bedienelemente nutzen weiterhin deren eigenen Bereich. Bereits sichtbare übergroße Ziele behalten ihre Scrollposition. Hinweisfelder versuchen freie Seiten, bevor sie im sichtbaren Ziel erscheinen; irreführende Pfeile außerhalb des Bildes werden dann ausgeblendet. Die Tutorialsteuerung reserviert eigenen Platz, sodass lange Übersetzungen scrollbar bleiben und keine Navigationsschaltflächen verdecken.

Das unabhängige gemeinsame schwebende Menü behält sein normales Thema, Rahmen, Schaltflächen, Abstände und Hintergrundunschärfe. Es liegt oberhalb der Tutorialabdunklung, ebenso die Auswahl zur Wiederholung am Seitenkopf. Die Abdunklung spart Ziel, schwebende Steuerung und Broadcast-Banner aus; Hinweisfelder halten Abstand zu sichtbaren Bannern. Die Steuerung bleibt in hellen und dunklen Themen im Ansichtsfenster.

Anleitungstexte beschreiben verfügbare Aufgaben und Bedienelemente ohne sachfremde Zusicherungen über Berechtigungen oder nicht ausgeführte Aktionen.

## Seitenbereitschaft

Nach `page:mounted` führt der Host `page:ready` mit den Phasen `prepare`, `blocking`, `ready` und `afterReady` aus. Die Darstellung wird abgeschlossen, während die blockierende Phase auf Startaufgaben wartet. Nachgelagerte Anmeldeeinrichtung steht dabei vor den Versionshinweisen. Deren Eigentümer wartet auf Einstellungen, Metadaten und das Schließen des Popups, bevor die Seite bereit gemeldet wird. Ein Abbruch schließt ein veraltetes Popup ohne Lesebestätigung. Automatische Tutorials und Wiederholungen über die Seitenüberschrift bleiben bis zur Bereitschaft zurückgestellt. Navigation verwirft die alte Seite; verspätete Arbeit kann die neue Seite nicht freigeben.

Weitere Popup-Eigentümer können vor dem Seitenaufbau mit `registerPageReadinessBlocker` aus dem gemeinsamen Modul `page-readiness.js` einen Ablaufbeitrag anhängen. Übergeben Sie eine eindeutige Eigentümerkennung `id`, optional `order` und das Eigentümersignal `signal`. Geben Sie ein Promise zurück, das nach Prüfung oder Popup-Abschluss aufgelöst wird. Der Rückruf erhält `input.signal` mit Seiten- und Eigentümerabbruch. Ersetzungen und Bereinigung bleiben lebenszyklussicher. Verbraucher verwenden `ui:pageReadiness.isReady()` oder `afterReady`, um Benachrichtigungen und andere Seitenaktionen zurückzustellen.

## Dashboard-Menüs Und Aktionen

Die Dashboard-Anleitung hat bis zu 18 Schritte und öffnet Benachrichtigungen und Kontomenü bewusst über deren echte Klick-Handler. Klickübungen unterdrücken Hover; Erklärungen zu den Menüs lassen löschende oder navigierende Aktionen inaktiv. Das Kontomenü erklärt Einstellungen, Dokumentation, rollenabhängige Verwaltungslinks und Abmeldung. Die Anleitung behandelt außerdem die Seitenaktionsleiste, Sprachwechsel, Darstellung und Layoutbearbeitung.

Vorübergehende Oberflächen registrieren Element, Schließaktion und Eigentümersignal über `ui:transientSurfaces.register(element, close, signal)`. Eine Anleitung bindet mit `attachLifetime(element, groupSignal)` nur die passende Suche, Benachrichtigungsansicht oder das Kontomenü an die Schrittgruppe. Klicks auf Tutorialaktionen erreichen keine Hintergrund-Handler zum Schließen bei Außenklicks; Menüs bleiben während ihrer Erklärungen offen.

Fehlende Bedienelemente mit `missing.action: "skip"` werden sowohl beim ersten Besuch als auch bei Wiederholungen ausgelassen, einschließlich rollenbedingt verborgener Menüeinträge.

Schrittpfade unterstützen `minRole`, das synchrone boolesche Prädikat `when({ firstTime, completed, skipped, targetAvailable })` und `dependsOn: ["earlier-step-id"]`. Nicht berechtigte oder bedingt ausgeschlossene Schritte zählen nicht zum Fortschritt. Abhängigkeiten müssen auf frühere Schritte zeigen; unbekannte, doppelte, eigene und spätere Verweise werden abgewiesen. Interaktive Schritte erfüllen Abhängigkeiten erst nach erfolgreichem Ereignis oder Wartezustand. Weiter überspringt sonst den abhängigen Zweig; statische Schritte werden durch Weiter erfüllt. Bedingungen erhalten unveränderliche Ergebnislisten. Die Gesamtzahl zeigt den aktuell verfügbaren Pfad und kann nach Interaktionen wachsen. Zurück setzt Ergebnisse ab dem Ziel zurück. `restart()` und Tutorial neu starten setzen alle Ergebnisse zurück und schließen temporäre Oberflächen innerhalb derselben Sitzung. Suche, Benachrichtigungen und Kontomenü erfordern das Öffnen des jeweiligen Steuerelements. Verwaltung verlangt `minRole: "admin"`; optionale Dock-Steuerelemente werden nach Sichtbarkeit gefiltert. Die Hervorhebung folgt den tatsächlichen Dock-Grenzen auch unterhalb der Fußzeilengrenze; Erklärungskarten behalten ihren reservierten Ansichtsbereich.

Banneraktionen bleiben per Schaltfläche, Link und Tastatur nutzbar. Sie beenden die Anleitung über `ui:tutorial:priority`, bevor eigene Dialoge oder Navigation beginnen. Banneraktionen sind per Tab erreichbar.

Suchschritte in Overlays verwenden deren Ansichtsbereich, damit Kopf- und Fußzeilen die Hervorhebung des Eingabefelds nicht abschneiden. Jede Filter-Schaltfläche beendet die Filterübung. Schritte, die Weiter oder Fertig benötigen, heben die Aktion nur mit einer pulsierenden Animation ohne dauerhafte Umrandung hervor; reduzierte Bewegung deaktiviert sie. Wartende und automatisch fortschreitende Schritte zeigen diesen Hinweis nicht.

Jeder Tutorial-Schritt legt `highlightNext` ausdrücklich fest: Erklärungen, die Weiter oder Fertig benötigen, aktivieren den Hinweis; interaktive und wartebasierte Übungen deaktivieren ihn. Reduzierte Bewegung deaktiviert die Animation; der normale Tastaturfokus bleibt sichtbar. Alle bestehenden Anleitungen wurden darauf geprüft, einschließlich Suchergebnissen und Benachrichtigungen.

Das optionale boolesche Feld `highlightNext` ist standardmäßig `false`; der Host leitet es nicht aus Interaktionen oder Wartebedingungen ab. Legen Sie es in der Schrittdefinition ausdrücklich fest. Aktivierte Hinweise erscheinen nach der Vorbereitung und beachten reduzierte Bewegung.

Zurück von außerhalb einer abgeschlossenen Schrittgruppe oder eines Abhängigkeitszweigs führt zu dessen Einstieg und setzt die Ergebnisse zurück. Innerhalb eines Zweigs bleibt Zurück schrittweise. So wird ein geschlossener Suchdialog nicht erneut aufgerufen und automatisch übersprungen.

Seitenschritte können mit `targetMatch: "first"` den ersten sichtbaren, nutzbaren Treffer im deklarierten Abschnitt wählen. Standardmäßig ist weiterhin ein eindeutiger Treffer erforderlich. Fehlende oder deaktivierte Ziele folgen der festgelegten Überspringregel. Aktionsbezogene Hervorhebungen zeigen jetzt auf bearbeitbare Schalter, Rollenfelder, Speicherquoten, Benachrichtigungstests, Freigaben, Datensätze und Modulaktionen. Komponenten verwendet einen bearbeitbaren sichtbaren Schalter; notwendige und versteckte Steuerelemente sind ausgeschlossen.

Tutorial neu starten ist nach dem ersten sichtbaren Schritt verfügbar; ein Wiederholungsbutton wird nicht angezeigt. Einführende UI-Schritte heben ihre Bereiche hervor, auch leere Jitsi-Besprechungslisten und Teilnehmer finden. Lernanbieter verwenden veröffentlichte Study-Sprachziele und das öffentliche Arbeitsbereichsziel. `highlightNext` bleibt für Erklärungen aktiv und für ereignisgesteuerte Schritte deaktiviert.

Schwebende Menüs verwenden die Capability `ui:floatingMenus` Version 1 und die gestuften Flows `ui:floatingMenu:request`, `present`, `dismiss` und `release`. Gleiche Prioritäten folgen der Anforderungsreihenfolge; höhere Prioritäten unterbrechen niedrigere. Eine Reservierung bietet `ready` für die erste Freigabe oder Abmeldung, `present(element, { visible })`, `dismiss(element)` und `dispose()`. Tutorials behalten Priorität 100 bis Abschluss, Abbruch oder Anbieterentfernung, auch zwischen Schritten. Composer-Slots und die Wiederholungsauswahl verwenden dieselbe Warteschlange. Abgebrochene Anforderungen und veraltete Darstellungen ersetzen keine neueren Menüs; leere Slots geben frei, und beim Seitenabbau werden Beobachter und Reservierungen entfernt.

Sprechblasen behalten sichtbare Dock-Steuerelemente unterhalb des reservierten Menübereichs als Anker und meiden das tatsächliche Aktionsmenü. Der Wiederholungsschritt hebt den ?-Button selbst hervor. Dieser behält während Tutorials die Textfarbe des Themes; die Wiederholung ersetzt keine laufende Anleitung.

Der Abschluss gehört zum stabilen Konto- und Anbieter/Tutorial-Bezeichner. Inhalts- und Paketupdates setzen ihn nie zurück. Eine abgeschlossene Anleitung wird nur über das ? im Seitenkopf erneut gestartet. Bezeichner bei Überarbeitungen beibehalten; der Abschluss bleibt im Browserspeicher des Kontos. Jede erfolgreich abgeschlossene Sitzung speichert den Abschluss vor der erneuten Seitenerkennung, auch beim direkten Start über das öffentliche Anbieter-Handle.

Tutorial neu starten erscheint nach dem ersten sichtbaren Schritt. Wiederholungen bieten Überspringen vor dem letzten sichtbaren Schritt; der letzte Schritt bietet Fertig. Ein einteiliger Guide bietet weder Tutorial neu starten noch Überspringen. Erstdurchläufe bieten weiterhin nie Überspringen.

Der ?-Button steht in derselben Zeile wie der Seitentitel. Er zeigt keinen Hover-Tooltip und behält seine lokalisierte barrierefreie Beschriftung.

Geht ein Ziel während asynchroner Darstellung verloren, wird es vor der Bereitschaftsmeldung erneut aufgelöst. Neustart und Abbruch verhindern veraltete Wiederherstellung und blockierte schwebende Menüs.

`scope` begrenzt Ziele und Erkennung. Das optionale `visibleWhen` verlangt ein eindeutig sichtbares Element, ohne Ziele auf dessen Nachfahren zu beschränken; sie bleiben innerhalb der Komponente. Die Bibliotheksverwaltung prüft damit ihren Browser und erklärt die Suche in der Seitenleiste. Ungültige Selektoren brechen die Registrierung ab und räumen den Anbieter auf.

## Zuverlässige Anleitungen

Binde die Erkennung an die aktive Ansicht, nicht nur an ihre URL. Reiter derselben URL, ausgewählte Stapel, Inhaltsebenen und Dialoge benötigen sichtbare, komponenteneigene Merkmale. `scope` muss alle Ziele enthalten; für Seitenleisten außerhalb des Inhalts dient `visibleWhen`. Eine Composer-Element-ID ist Layoutmetadatum und keine garantierte DOM-ID. Verwende echte Feature-Elemente. Hebe bei gestalteten Schaltern die sichtbare Beschriftung statt des versteckten Eingabefelds hervor.

Pro sichtbarer Ansicht startet in einer Browsersitzung nur eine Anleitung automatisch. Ihr Abschluss reiht keine weiteren ein; diese bleiben über ? erreichbar. Ein Abschnittswechsel kann dessen Anleitung entdecken. Ergänzende Einführungen setzen `automatic: false`. Abschluss-IDs bleiben stabil. Leite Besucher von Explore nicht für eine Einführung zurück zur Übersicht. Spracheinführungen gehören zur Study-Übersicht; Aktivitätsführungen gehören dem Host.

Folge der sichtbaren UI-Reihenfolge, außer eine Interaktionsabhängigkeit verlangt etwas anderes. Jeder Schritt erhält ein eigenes Bedienelement oder einen eigenen Bereich. Fasse doppelte Erklärungen zusammen. Erkläre Ziele und Ergebnisse der Nutzer. Erwähne Speichern/Verwerfen oder Änderungsprüfung nur, wenn tatsächlich Änderungen möglich sind. Prüfe leere Kalender und Listen, optionale Bedienelemente, Rollen und fehlende Funktionen.

`targetMatch: "first"` behält das gewählte verbundene Element während der Komponentenmontage; eine durch Hover geänderte Reihenfolge darf nicht zu einer anderen Karte führen. Anfangs fehlende Ziele folgen der definierten Richtlinie. Geht ein bereits gezeigtes Ziel verloren, bleiben die Aktionen erhalten. Bis zu fünfzehn Sekunden wird auf seine Rückkehr gewartet; danach bleiben Weiter und Neustart möglich. Scrollen darf die Anleitung nicht still abschließen.

Detailzweige verwenden `interaction: "target"`, `suppressHover`, Ereignisbedingungen, `group` und `dependsOn`. Weiter vor dem Öffnen überspringt den Zweig. Der optionale Selektor `popup` erlaubt nur den erwarteten komponenteneigenen Dialog; andere Dialoge unterbrechen weiterhin. `portal` begrenzt ein Seitenziel auf die ausdrücklich gewählte Oberfläche desselben Dokuments. Die Eigentümerseite muss verfügbar bleiben. Binde das Schließen an `groupSignal`, damit Zurück, Neustart, Abschluss, Navigation und Entfernen aufräumen. Passive Erklärungen verwenden `layer: "overlay"` und lösen keine Datenänderungen aus.

Die Shell schließt das Kontomenü in der Validierungsphase des Tutorialstarts, auch bei direkten Anbieterstarts. Besitzer von Bereitschaftsblockern werden in `ui:pageReadiness.registerBlocker(options, handler)` gemeinsam für gebündelte und direkte Importe verwaltet. Nutze diese Methode oder `registerPageReadinessBlocker`; ersetze per Besitzer-ID und sichere die Bereinigung gegen alte Abbrüche. Verwende keine konkurrierenden lokalen Registrierungslisten.

Prüfe echte gerenderte Ziele und Fortschritt über öffentliche Verträge in Quell- und Produktionsbuilds: direkte und wiederholte SPA-Montagen, Abschnittswechsel derselben URL, leere und gefüllte Daten, Scrollen, Layoutwechsel, Hover, optionale Elemente, Rollenverlust, Überspringen und Zurück in Zweigen, Neustart, Besitzerentfernung und Dialogschluss. Prüfe Schrittzahlen und Menüübergabe. Browser-Demos bleiben temporär; gemeinsame automatisierte Helfer bleiben erhalten. Feature-Änderungen prüfen Anleitungen, Übersetzungen und komponenteneigene Dokumentation zusammen.

Vertrauenswürdige enter/waitFor-Callbacks erhalten den öffentlichen ctx zusammen mit ihren Lebensdauersignalen. Gemeinsames Verhalten wird über dessen Fähigkeiten bezogen. Feature-Dialoge registrieren Element, eigene Schließoperation und Signal über ui:transientSurfaces; Detailzweige binden groupSignal über diesen Vertrag statt private Dialogbuttons zu suchen.

Popup-Portalziele werden nur im aktiven erwarteten Dialog aufgelöst. Schließende Overlays können während ihrer Animation verbunden bleiben; sie dürfen weder Ziele noch optionale Schrittzahlen späterer Zweige liefern. Prüfe schnelles Zurück, erneutes Öffnen und Neustarten auch im Produktionsbuild.

Bedingungen erhalten targetAvailable als unveränderlichen booleschen Wert des deklarierten, berechtigten Schrittziels. Bei fehlenden, versteckten, deaktivierten oder inaktiven Portalzielen ist er falsch. Nutze ihn für optionale Aktionen statt Dialogklassen anderer Komponenten zu prüfen.

Tutorial neu starten ist die erste Aktion im schwebenden Menü und verwendet btn-cancel. Sie bleibt im ersten sichtbaren Schritt verborgen.

Prüfen Sie Ziele in der gerenderten Oberfläche mit vorhandenen und leeren Daten. Ein Selektor muss einen sichtbaren, konkreten Bereich erkennen; unterscheiden Sie wiederholte Abschnitte durch eigene semantische Markierungen und passen Sie Hervorhebungen an die Steuerelemente an. Nicht verfügbare optionale Aktionen zählen nicht als Schritte. Nur ausdrücklich eingeschriebene Sprachen erhalten Modulanleitungen; ein direkter Besuch ist keine Einschreibung. Details und Einstellungen nutzen Interaktionszweige: Weiter überspringt ungeöffnete Zweige, Zurück führt zu deren Anfang. Verhindert der Besitzer die native Klickaktion, muss advance.accept den entstandenen Zustand prüfen. Erklären Sie nützliche Aktionen und Ergebnisse statt interner Schutzmechanismen. Die Anleitungsauswahl verwendet dieselbe bewegungsabhängige Atemanimation wie Weiter.
