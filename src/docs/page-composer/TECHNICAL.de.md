# Technische Referenz

Page Composer verwaltet Elementanordnung, responsive Darstellung, DOM-Lebenszyklen sowie optionale Layout- und Entwurfsspeicherung.

## Schnittstellen

createPageComposer(root, options) erzeugt den Seitenlebenszyklus. Elemente liefern Inhalt und Renderfunktionen; init bindet die Hülle ein und refresh aktualisiert Beschreibungen.

Die editoreigenen Composer-Helfer stellen folgende Verträge bereit. Ihre Quelltextköpfe enthalten Aufrufbeispiele; Seiten verwenden sie normalerweise über `createPageComposer`.

| Helfer                                                                                                                              | Vertrag                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`createLayoutSaveHandler`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/layout-save.js)           | Erzeugt einen zusammengefassten gestuften Speicheraufruf; siehe Persistenzvertrag unten.                            |
| [`commitLayoutEdit`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/layout-save.js)                  | Übernimmt den Editorzustand mit gesperrter Interaktion und wiederholbaren Speicherfehlern.                          |
| [`bindComposerPointerDrag`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/pointer-drag.js)          | Verwaltet Zeigererfassung, Scrollen am Rand, Ablegen/Abbruch und Gestenbereinigung.                                 |
| [`RESIZE_EDGES / resizePlacement`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/resize-model.js)   | Beschreibt acht Kanten/Ecken und berechnet eingerastete, begrenzte Geometrie ohne Kollisionsprüfung.                |
| [`resolveResizeAvailability`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/resize-availability.js) | Liefert je Kante/Ecke einen CSS-Zeiger für zulässige Richtungen oder `null`.                                        |
| [`appendResizeControls`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/resize-controls.js)          | Bindet Geometrie und Kollisionsprüfung des Besitzers an Größenvorschau und Platzierungsänderungen; speichert nicht. |
| [`findGridSwap / applyGridSwap`](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/swap-model.js)       | Ermittelt ein zulässiges Tauschziel und übernimmt beide Positionen nach Prüfung des aktuellen Zustands atomar.      |

## Konfiguration

createPageComposer erhält elements, pageManifest, i18n, signal und Layoutoptionen. Füllende Elemente nutzen den responsiven Vertrag; Präferenzen verwenden preferenceKey.

## Verhalten

### Überblick

`createPageComposer` ist das Layout-Orchestrierungsutility, das von allen Cognis-Seiten verwendet wird. Einzelne Seitenmodule deklarieren _was_ gerendert werden soll — eine Liste benannter Inhaltsblöcke, sogenannte Elemente — und der Composer übernimmt, _wie_ diese Blöcke angeordnet, persistiert, navigiert und neu gerendert werden.

### Verantwortlichkeiten

- Eine Menge benannter Elemente in einen übergeordneten DOM-Knoten rendern.
- Ein freies 90-px-Raster verwalten, wenn `allowCustomization: true`.
- Elementplatzierung und -sichtbarkeit über die Präferenzen-API persistieren und wiederherstellen.
- Unterseiten-Navigation antreiben, wenn `subPageNavigation: true`.

### Elemente

Ein Element ist ein benannter Inhaltsblock:

```js
{
  id: 'mein-widget',
  label: 'Mein Widget',
  render: () => '<h2>Inhalt</h2>',
  gridSize: { default: [4, 3], min: [2, 2] },
  pinned: false,
}
```

| Feld       | Erforderlich | Beschreibung                                                     |
| ---------- | ------------ | ---------------------------------------------------------------- |
| `id`       | Ja           | Eindeutiger String-Identifier                                    |
| `label`    | Ja           | Menschenlesbares Label                                           |
| `render`   | Ja           | Funktion, die einen HTML-String zurückgibt                       |
| `gridSize` | Nein         | `{ default: [w,h], min: [w,h] }` in 90-px-Raster-Einheiten       |
| `pinned`   | Nein         | Wenn `true`, kann das Element nicht vom Benutzer entfernt werden |

### Raster-Layout

Gespeicherte Profile für das aktuelle Raster erhalten ausdrückliche Breiten, Höhen und Abstände, statt freie Zeilenbreite neu zu verteilen. Haupt- und verschachtelte Renderer teilen die Metriken für gebrochene Rasterwerte; verschachtelte gespeicherte Raster behalten den Spurabstand des Editors. Composer-Dokumente und Inhaltsbereiche reservieren Scrollbarplatz, damit das Beenden der Bearbeitung kein anderes Spaltenprofil auswählt. `snapDragPlacement` verschiebt nur den gezogenen Kandidaten bis zur nächsten belegten Zeile oder zum Ursprung nach oben und überspringt keine andere Karte. Gelbe Vorschauen zeigen das Ziel, das beim Loslassen vor Fertig übernommen wird. Fertig schreibt das sichtbare Layout ohne abschließendes Zusammenpacken. `resizeLimitAxes` meldet horizontale und vertikale Grenzüberschreitungen vor der Begrenzung, auch bei gemischten Eckbewegungen; orange Rückmeldung hält jede Achse innerhalb ihrer Grenzen.

Maus-, Touch- und Tastaturtausch verwenden gemeinsam `previewGridSwap`, `findGridSwap` und `applyGridSwap` aus `swap-model.js`. Horizontale Tauschvorgänge erhalten die äußeren linken und rechten Kanten des Paars sowie den Abstand dazwischen. Breite und Höhe jedes Elements bleiben unverändert. Benachbarte Elemente gleicher Höhe können auch bei unterschiedlichen Breiten tauschen. Unterschiedliche Höhen sind nur zulässig, wenn beide vollständigen Zielrechtecke alle anderen sichtbaren Elemente, auch oberhalb oder unterhalb beider Ziele, sowie einander freihalten. Vertikal gestapelte Elemente behalten die Zielursprünge. Rechteckprüfungen hängen von der Anzahl der Platzierungen statt von der belegten Rasterfläche ab. Vor der atomaren Übernahme werden aktuelle Positionen, Sichtbarkeit und Rastergrenzen erneut geprüft; Vorschauen verändern das Layout nicht. Die gemeinsame Ziellinie verwendet den grünen Themenakzent für zulässige und die rote Gefahrenfarbe für blockierte Tauschvorgänge. `previewGridSwap` erhält dieselben Argumente und liefert `{ target, valid }` für die Anzeige, einschließlich blockierter oder mehrdeutiger Ziele; außerhalb aller Elemente liefert es `null`.

Beide Helfer erhalten den aktuellen Zustand über `gridCols`, `layout.placements` und `layout.hidden`. `findGridSwap(state, col, row, w, h, sourceId)` liefert die aktuelle Zielplatzierung oder `null`; `applyGridSwap(state, sourceId, targetId)` liefert einen booleschen Wert und verändert bei Ablehnung keine Position. Tastaturbindungen erhalten sowohl `findSwapCandidate` als auch `commitSwap`; Composer liefert diese Operationen aus dem gemeinsamen Tauschmodell.

Standardmaße und Mindestbreiten der Elemente müssen Kartenabstände und Inhalt berücksichtigen. Die Dashboard-Marke nutzt mindestens drei Rasterspalten; Kontodaten verwenden standardmäßig zwei Zeilen, Begrüßung und letzte Anmeldung mindestens drei Spalten. Passen aktuelle Breitengrenzen nicht mehr in eine gespeicherte Zeile, ordnet Composer sie innerhalb dieser Grenzen neu an, ohne das gespeicherte Profil zu überschreiben. Haupt- und verschachtelte Ansichten verwenden dieselbe Regel. Normalisierte Zeilen müssen jede Karte innerhalb der deklarierten Rasterspalten halten; bei einer Grenzverletzung wird die Zeile neu angeordnet.

Haupt- und verschachtelte Editoren teilen die Größenänderung in acht Richtungen über `resize-model.js` und `resize-controls.js`. Linke und obere Griffe verschieben den Ursprung und halten die gegenüberliegende Kante fest. Zeigerbewegungen rasten in Rastereinheiten ein; Größenlimits, Rastergrenzen und Kollisionsprüfungen gelten in jeder Richtung. Touch-Ziele bleiben 44px groß; eingerückte Entfernen-Schaltflächen lassen die Eckgriffe frei.

Bearbeitbare Rasterzeilen haben eine Basishöhe von 90 px; die Spalten teilen die verfügbare Inhaltsbreite mit 8 px Abstand zwischen den Rasterspuren. `gridSize.max: 'full'` erstreckt das Element über alle verfügbaren Spalten. `gridSize.max: 'half'` erstreckt es über die Hälfte der Spalten.

Im Bearbeitungsmodus verwenden Karten, Ziehvorschauen und Größenänderungsgriffe dieselbe Pixelgeometrie mit festen Zeilen und berücksichtigten Abständen, auch für halbe Rastereinheiten. Der scrollbare Inhalt reserviert den Platz für die Bildlaufleiste vor der Messung; Zeigerkoordinaten schließen den gemeinsamen Inhaltsabstand aus. Elementfenster passen ihre Breite innerhalb des sichtbaren Bereichs an ihren Inhalt an. Die gemessene Breite bestimmt ihre anfängliche und begrenzte Position. Die Höhenbegrenzung wird vor der Breitenmessung angewendet, damit interne Bildlaufleisten bei der horizontalen Position berücksichtigt werden.

Die Zeigererfassung erhält den angefassten Punkt auch beim Scrollen, statt die Karte unter dem Zeiger zu zentrieren. Haupt- und verschachtelte Editoren teilen Zeigerprüfung, Randscrollen, Abbruch und Freigabe der Erfassung. Zeigerabbruch oder Entfernen des Editors verwirft vorläufige Bewegung und Rastererweiterung. Größenregler und Entfernen bieten auf Touchscreens 44px große Ziele. Das Minimieren von Elemente blendet Inhalt und Aktionen bis zum erneuten Öffnen aus. Der Bearbeitungsmodus bleibt bis zum erfolgreichen Speichern aktiv, damit eine responsive Neudarstellung während des Schreibens kein älteres Layout wiederherstellt.

Größenregler erscheinen nur, wenn eine zulässige Größenänderung innerhalb der Grenzen und ohne Überschneidung mit belegten Rasterfeldern möglich ist. Verkleinern bleibt neben anderen Elementen verfügbar. Zeiger unterscheiden Vergrößern, Verkleinern und gemischte Eckbewegungen; Versuche mit Überschneidungen zeigen `not-allowed`. Das Entfernen verwendet die gemeinsame Darstellung von `btn-cancel`.

### Unterseiten-Navigation

Wenn `subPageNavigation: true`, ist jeweils nur ein Element sichtbar. Toolbar-Schaltflächen mit `[data-composer-scroll]` dienen als Abschnittsselektoren. Der aktive Abschnitt wird im URL-Hash für Deep-Links gespeichert.

### Sub-Composer

`subComposerOptions` auf einem Element lädt einen verschachtelten Composer in diesem Element:

```js
{
  id: 'erscheinungsbild',
  subComposerOptions: {
    heading: 'Erscheinungsbild',
    elements: [...],
    onRender: () => steuerungBinden(),
    columns: 2,
  },
}
```

### DOM-Parking

DOM-Parking ist standardmäßig deaktiviert. Setzen Sie `enableDomParking: true` im Page Composer nur dann, wenn Medien-DOM Composer-Neudarstellungen überstehen muss. Ist die Option aktiv, werden Karten mit Iframes oder anderen Medien als intaktes DOM geparkt und wiederhergestellt; dies ist für zustandsbehaftete Einbettungen wie Jitsi Meet gedacht. Normale Seiten sollten neu gerendert werden und die temporäre Formularzustandswiederherstellung nutzen, damit aktualisierte Inhalte nicht durch einen veralteten geparkten Baum verdeckt werden. `refresh(elements)` aktualisiert Elementdefinitionen und Platzierung und erhält vorhandenes Karten-DOM. Mit `refreshElements(ids)` werden geänderte Inhalte durch Composer neu erzeugt; reine Layoutänderungen erhalten Bedienelemente und Entwürfe.

### Persistenz

Layout-Schreibvorgänge nutzen `ui:pageComposer:saveLayout` mit den Stufen `validate`, `persist` und `notify`. Gleichzeitige Speichervorgänge für denselben Einstellungsschlüssel teilen einen unveränderlichen Anfrage-Schnappschuss. Fertig, das Layout-Kürzel und Zurücksetzen zeigen lokalisierte Erfolgs- oder Fehlermeldungen. HTTP-Fehler und fehlende Sitzungen können keinen Erfolg melden. Während des Speicherns sind Bearbeitungsaktionen gesperrt; bei einem Fehler werden ausstehende Änderungen wiederhergestellt und der Editor bleibt für einen erneuten Versuch offen. Seitenabbruch beendet die Speicherung und unterdrückt spätere Meldungen. Diagnosen nutzen `ui:log`.

`createLayoutSaveHandler({ctx, save, notify, i18n, signal})` liefert `update(key, profiles, columns, layout)`. Die injizierte Funktion `save(key, profiles, columns, layout, signal)` muss aktualisierte Profile liefern und bei Schreibfehlern ablehnen. `update` liefert diese Profile oder `null` bei Speicherfehlern beziehungsweise Seitenabbruch; Ablauf- und Übersetzungsfehler werden weitergegeben. Der ctx muss Ablaufregistrierung, Ausführung und Fähigkeiten unterstützen. `notify` verwendet die gemeinsame Toast-Signatur; `i18n.t` liefert Erfolgs- und Fehlerschlüssel.

`commitLayoutEdit({state, prepare?, save, finish?, render})` benötigt klonbares `state.layout`, veränderliche Flags `editing`/`saving` und Rückrufe für denselben Zustand. Die Funktion verwaltet `layoutSnapshot`; optional steuern `container` oder `contentGrid`, `elementsPanel` und `signal` Interaktion und Seitenlebensdauer. Das optionale `prepare()` setzt das Layout bei Zurücksetzen synchron zurück; normale Fertig-Aktionen lassen es weg. `save()` muss einen booleschen Wert liefern und bei Erfolg die Profile des Besitzers aktualisieren. Bei false wird die Anordnung vor prepare wiederhergestellt; true aktualisiert den Schnappschuss und beendet die Bearbeitung nur mit `finish`. Unerwartete Rückruffehler werden nach Wiederherstellung der Interaktion weitergegeben.

Layouts verwenden `PUT /api/v1/social/users/:accountId/preferences/:preferenceKey` mit dem Inhalt `{ layout: profiles }`. `profiles.layoutsByGrid` ordnet Schlüsseln wie `cols-<count>` Layouts der Form `{ placements: [{id, col, row, w, h}], hidden: [] }` zu. Der zugehörige GET liefert die serialisierten Profile in `data.layoutJson`. Das Speichern benötigt das aktuelle Konto und Zugriffstoken.

Zusätzlich werden Formularentwürfe pro Benutzer, Seitenpfad und Composer-Schlüssel in `localStorage` gehalten. Dadurch bleiben Eingaben nach Seitenneuladen und responsiven Neu-Renderings erhalten. Die persistente Entwurfsspeicherung ist opt-in: Nur Felder, deren nächster Vorfahre `data-composer-include-form-memory="true"` trägt, werden in localStorage geschrieben. Felder ohne opt-in-Vorfahren werden dennoch im flüchtigen In-Memory-Snapshot erfasst, sodass sie responsive Neu-Renderings innerhalb derselben Sitzung überdauern, aber niemals in den persistenten Speicher geschrieben werden. Sensible Felder (`password`, `file`, `hidden` sowie Kennungen mit `password`/`secret`/`token`) sind unabhängig vom opt-in-Status stets von der persistierten Entwurfsspeicherung ausgeschlossen.

Karten mit größeren Formularen (mindestens 6 persistierbare Felder) zeigen eine Schaltfläche **Entwurf zurücksetzen**. Diese entfernt den gespeicherten Entwurf für die Karte und setzt die aktuellen Felder auf ihre Standardwerte zurück.

### Zeigersteuerung passend zum Thema

Die gemeinsame Zeigerstil-Schaltfläche verwendet die normale Themen-Vordergrundfarbe (`--text`) für Maus-, Laser- und Fadenkreuzsymbole, auch auf eingebetteten Komponentenseiten. Die Zeigerfarben der Teilnehmer bleiben unverändert.

### Responsives Layout

Page Composer verwendet die verfügbare Inhaltsbreite statt Gerätenamen. Bis 640 CSS-Pixel bilden gewöhnliche Karten eine spaltenbreite Leseansicht mit inhaltsabhängigen Zeilen; die Desktopanordnung bleibt erhalten. Rahmenlose eingebettete Oberflächen behalten ihre eigene Größensteuerung. Breitere Bereiche verwenden weiterhin das Raster und die nach Spaltenzahl gespeicherten Profile.

Der Layouteditor bleibt auf Smartphones und Tablets verfügbar. Touch-Größenregler und Entfernen-Schaltflächen bleiben sichtbar. Mit Hinzufügen im Elemente-Bereich ist kein Ziehen nötig; ein fokussiertes Widget wird mit Pfeiltasten verschoben und mit Umschalt plus Pfeiltasten skaliert. Abgebrochene Zeigergesten werden nicht übernommen. Verschachtelte Editoren nutzen die gesamte Breite; Größenänderungen erhalten bestehende Formularfelder.

Unter 900 CSS-Pixel öffnet sich die Werkzeugleiste als Seitenbereich. Filter und andere lokale Aktionen bleiben darin bedienbar; Navigation schließt ihn. Escape oder der Hintergrund schließen den Bereich und stellen den Fokus wieder her. Navigation, Werkzeugleiste, Suche und Dialoge teilen die Scrollsperre, damit verschachtelte Oberflächen die Seite nicht dauerhaft sperren oder hinter Dialogen scrollen lassen.

Die Arbeitsbereichseinführung markiert auf schmalen Bildschirmen die sichtbare Navigationsschaltfläche und erklärt Touch- und Tastatursteuerung. Browserregressionen prüfen 320, 390, 768, 1024 und 1440 CSS-Pixel, Drehung, Tastatureingabe und wiederholtes Einbinden. `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/responsive-browser.test.js` benötigt einen Rechner, auf dem Chromium starten kann. Emulation bestätigt weder iOS Safari noch installierte PWAs oder Bildschirmtastaturen auf echten Geräten.

Auf Smartphones teilen sich Marke und Seitentitel die erste Kopfzeile; Navigation und Kontosteuerung stehen in der zweiten. Der Untertitel bleibt für Hilfstechnologien verfügbar. Auf den kleinsten Bildschirmen lässt das Markensymbol Platz für lange Titel. Geschlossene Werkzeugleistenschalter scrollen unter der angehefteten Kopfzeile. Schwebende Aktionsmenüs verwenden kompakte Abstände und behalten 44 Pixel große Touchflächen. Tutorialaktionen haben einen deckenden Hintergrund und das Ziel eine deutliche Umrandung. Auf niedrigen Bildschirmen darf die Erklärung den Kopfbereich nutzen, ohne die Fußzeile zu verdecken. Mobiler Text folgt der gewählten Schrift und Größe, statt die gesamte Seite zu verkleinern.

Die gemeinsamen Kopfzeilen- und Tutorialtests laufen mit `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/*.test.js`. Für direkte und SPA-Navigation durch integrierte Seiten benötigt `COGNIS_CORE_BROWSER_URL` eine isolierte laufende Instanz und `COGNIS_BROWSER_CREDENTIALS` eine JSON-Datei mit `username`, `password` und `provider`. Anschließend `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/integration/core-pages-browser.test.js` ausführen. Die Tests erwarten ein eigenes Administratorkonto und aktivierte integrierte Gateways; Seiten externer Module sind ausgeschlossen.

### Anpassbare Arbeitsflächen

Der Page Composer steuert die Auswahl der Darstellung. Jede Elementfunktion erhält einen unveränderlichen Kontext mit `compact`, `layout`, `drawer` und `touch`. Entscheidend ist die innere Breite der Karte, einschließlich Änderungen durch Seitenleisten oder verschachtelte Layouts. Mit `responsive: true` erhält ein Element bei einem Darstellungswechsel neues Markup; normale zustandsbehaftete Elemente behalten ihren DOM. `onResize(presentation)` dient Geometrieanpassungen. Seitencode benötigt keine eigenen Bildschirmabfragen oder Größenereignisse.

Desktop-Werkzeugleisten verwenden eine begrenzte gemeinsame Spalte, damit für Inhalte genügend Platz bleibt. Die Spalte berücksichtigt die gewählte Textgröße; Telefone und Tablets nutzen die Composer-Seitenleiste.

Die gemeinsamen `layout`-Werte sind `compact` (bis 640px), `medium` (bis 900px) und `regular`, gemessen innerhalb der Karte. Dichte Flächen wie der Kalender nutzen in beiden eingeschränkten Darstellungen die Terminliste.

Die vom Composer verwalteten Attribute `data-composer-layout`, `data-composer-drawer` und `data-composer-touch` steuern Layout und Eingabe. Normale und verschachtelte Komposition erhalten denselben Kontext. Der Composer überwacht Inhalt und Karten, stellt Formularwerte wieder her und entfernt Beobachter und Ereignisbehandlung beim Verlassen der Seite.

Layoutänderungen melden sich über `onResize`; `onRender` bindet das Verhalten gerenderter Inhalte. Reine Layoutänderungen behalten die Ereignisbindung unveränderter Bedienelemente. Eine ausdrückliche Inhaltsaktualisierung initialisiert die gewählten Elemente einmal.

Für Bildschirmtests mit einer isolierten laufenden Instanz setzt du `COGNIS_BROWSER_TESTS=1`, `COGNIS_CORE_BROWSER_URL` und `COGNIS_BROWSER_CREDENTIALS`. Optional trennt `COGNIS_BROWSER_BYPASS_SERVICE_WORKER=1` die Darstellung vom Service-Worker-Cache; Offline- und PWA-Verhalten erfordern eigene Prüfungen.

### Seiten und Seitenleisten

Über das Seitenraster im Hauptkopf wechselst du zu anderen Bereichen. Die kompakte Seitenauswahl hält den Tastaturfokus und schließt mit Escape. Page Composer stellt für alle Seitenleisten dieselbe SVG-Schaltfläche mit doppeltem Winkel oben links bereit. Messages öffnet damit die Unterhaltungen.

`stackAt: "medium"` fordert bis zur gemeinsamen Tabletgrenze eine fließende einzelne Spalte an. `readingOrder` legt deren Elementreihenfolge fest, ohne gespeicherte Desktoplayouts zu ändern. Formularfelder und Entwürfe bleiben bei Layoutänderungen erhalten.

Feste Seiten mit einem Element verwenden `fillViewport: true`. Ihr primärer Lesebereich erhält `data-composer-viewport-body`; Composer reserviert dafür 20rem und misst umliegende Abstände und Bedienelemente gesondert. Wenn möglich passt die Seite in den verbleibenden Bildschirm, andernfalls scrollt das Dokument bei erhaltener Mindesthöhe. Größenänderungen der Bedienelemente, ausgetauschte Inhalte und größere Schrift berechnen das Minimum neu. Dokumentbildlauf vergrößert die angepasste Höhe nicht. Composer stellt die Seitenleistenschaltfläche bereit; `openToolbar(trigger)` und `closeToolbar()` bleiben für gezielte Aktionen verfügbar.

Gewöhnliche Dokumente, die mit ihrem Inhalt wachsen, verwenden `contentScrolling: false`. Kalender und Nachrichten passen sich dem Bildschirm an und scrollen ihren Lesebereich intern.

Gemeinsame Dialoge akzeptieren `surface: "reader"` für Leseinhalte. Die Fläche nutzt Composer-Darstellungshaken, hält Kopf- und Fußzeile außerhalb des scrollbaren Inhalts und beendet ihre Größenbeobachtung beim Schließen.

Kopf- und Fußzeile verwenden dieselbe Rahmenbreite. Ihre Außenkanten stimmen auf Telefonen, Tablets und Desktopbildschirmen überein.

Elemente können einen stabilen Bereich mit `data-composer-header` deklarieren. Composer platziert dort seine Seitenleistenschaltfläche und erhält dieselbe Schaltfläche samt Fokusverhalten bei Neuzeichnungen. Asynchron ersetzte Inhalte gehören in ein Kindelement dieses Bereichs. `data-composer-sidebar-trigger` kennzeichnet die gemeinsame Schaltfläche für Stile. Kalender und Messages gewinnen dadurch mehr Höhe für Inhalte.

Composer deaktiviert die automatische Scroll-Verankerung des Browsers im gesamten Rasterinhalt, damit sich verschachtelte Scroll-Positionen bei Breitenänderungen nicht verschieben. Die Inhaltskomponenten steuern das Scrollen beim Anfügen oder Ersetzen von Inhalten.

Die gemeinsamen Seitenabstände passen sich der Breite an. Auf dem Desktop bleibt ein einzelner Abstand zur Hauptfläche; die Schubladenbreite in rem berücksichtigt größere Schrift. Komponenten können ihre Bedienelemente passend dimensionieren und behalten ausreichend große Touch-Flächen.

Gemeinsame Seitenmenüeinträge kennzeichnen Auswahl und Tastaturfokus. Abstände und Scrollverhalten der Seitenleisten gehören zu Composer statt zu einzelnen Seiten.

Menüschaltflächen der Seitenleiste behalten transparente Ruheflächen sowie themengerechte Hover-, Auswahl- und Tastaturfokus-Stile. Formularfelder behalten ihre Feldstile, Aktionsschaltflächen ihre semantischen Farben. Helle Flächen verwenden eine mit der Textfarbe getönte Hover-Ebene.

### Composer-Flächen

Composer verwendet die Nachrichten-Fläche für Seitenleiste und Hauptinhalt. Jeder Toolbar-Beitrag erhält einen geschützten Rahmen `composer-sidebar-section`; sein äußerer Inhalt bleibt transparent und nutzt Composer-Abstände. Hauptkarten legen keine undurchsichtigen Hintergründe oder Schatten über die Fläche. Menüzeilen teilen Text-, Hover-, Auswahl- und Fokusdarstellung; ausdrückliche Bestätigungs-, Abbruch- und neutrale Bedienelemente behalten ihre semantischen Stile. Rahmenlose Einbettungen bleiben transparent. Seitenstile dürfen weder geschützte Flächenklassen überschreiben noch das gemeinsame Token `--toolbar-bg` setzen. Die Kaskadenebene `composerSurfaces` ist dem Host vorbehalten.

Composer verwaltet den Innenabstand der Inhaltssektion: 28px auf breiteren Bildschirmen und 14px bis einschließlich 640px, auch bei bildschirmfüllenden Seiten. Rahmenlose Einbettungen bleiben bündig. Listenhüllen in Seitenleisten bleiben transparent und ohne Innenabstand, damit Menüeinträge keine zusätzlichen Kartenflächen erhalten. Seitenstile dürfen weder `--composer-grid-inset` setzen noch die Host-Abstände überschreiben.

### Laden von Schriftarten

Gemeinsame Texte umbrechen vor und nach dem Laden einer Schriftart innerhalb der verfügbaren Breite, ohne die gewählte Schriftgröße zu verringern.

Array-Angaben unterstützen `['full', 'fill']` für die gesamte Breite und das Ausfüllen der verfügbaren Höhe sowie `['full', n]` für die gesamte Breite mit einer numerischen Höhenbegrenzung. Haupt- und verschachtelte Composer berücksichtigen diese Maße in schmalen und breiten Rastern. Beim Scrollen am Rand wird die vorläufige Mindestzeilenzahl vor der Höhenzuweisung angewendet; Raster und Vorschau wachsen ohne zwischenzeitliche Verkleinerung zusammen. Nach der Erweiterung messen verschachtelte Ziehvorschauen ihren Container erneut, da ein übergeordnetes Element seinen bisherigen Scrollversatz verloren haben kann.

## Sicherheit

Composer steuert Darstellung und DOM-Lebensdauer statt Inhaltsrechte. Seitenaktionen nutzen Eigentümerabläufe; Markup und Styles beachten gemeinsame Menü- und Panelgrenzen.

## Referenz

- [src/ui/reuse/page-composer/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/index.js)
