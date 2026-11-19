# Page Composer

## Überblick

`createPageComposer` ist das Layout-Orchestrierungsutility, das von allen Cognis-Seiten verwendet wird. Einzelne Seitenmodule deklarieren _was_ gerendert werden soll — eine Liste benannter Inhaltsblöcke, sogenannte Elemente — und der Composer übernimmt, _wie_ diese Blöcke angeordnet, persistiert, navigiert und neu gerendert werden.

## Verantwortlichkeiten

- Eine Menge benannter Elemente in einen übergeordneten DOM-Knoten rendern.
- Ein freies 90-px-Raster verwalten, wenn `allowCustomization: true`.
- Elementplatzierung und -sichtbarkeit über die Präferenzen-API persistieren und wiederherstellen.
- Unterseiten-Navigation antreiben, wenn `subPageNavigation: true`.

## Architektur

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

Rastereinheiten sind 90 px breit und hoch. `gridSize.max: 'full'` erstreckt das Element über alle verfügbaren Spalten. `gridSize.max: 'half'` erstreckt es über die Hälfte der Spalten.

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

Layouts werden weiterhin über die Präferenzen-API unter `preferenceKey` gespeichert. Zusätzlich werden Formularentwürfe pro Benutzer, Seitenpfad und Composer-Schlüssel in `localStorage` gehalten. Dadurch bleiben Eingaben nach Seitenneuladen und responsiven Neu-Renderings erhalten. Die persistente Entwurfsspeicherung ist opt-in: Nur Felder, deren nächster Vorfahre `data-composer-include-form-memory="true"` trägt, werden in localStorage geschrieben. Felder ohne opt-in-Vorfahren werden dennoch im flüchtigen In-Memory-Snapshot erfasst, sodass sie responsive Neu-Renderings innerhalb derselben Sitzung überdauern, aber niemals in den persistenten Speicher geschrieben werden. Sensible Felder (`password`, `file`, `hidden` sowie Kennungen mit `password`/`secret`/`token`) sind unabhängig vom opt-in-Status stets von der persistierten Entwurfsspeicherung ausgeschlossen.

Karten mit größeren Formularen (mindestens 6 persistierbare Felder) zeigen eine Schaltfläche **Entwurf zurücksetzen**. Diese entfernt den gespeicherten Entwurf für die Karte und setzt die aktuellen Felder auf ihre Standardwerte zurück.

## Zeigersteuerung passend zum Thema

Die gemeinsame Zeigerstil-Schaltfläche verwendet die normale Themen-Vordergrundfarbe (`--text`) für Maus-, Laser- und Fadenkreuzsymbole, auch auf eingebetteten Komponentenseiten. Die Zeigerfarben der Teilnehmer bleiben unverändert.

## Responsives Layout

Page Composer verwendet die verfügbare Inhaltsbreite statt Gerätenamen. Bis 640 CSS-Pixel bilden gewöhnliche Karten eine spaltenbreite Leseansicht mit inhaltsabhängigen Zeilen; die Desktopanordnung bleibt erhalten. Rahmenlose eingebettete Oberflächen behalten ihre eigene Größensteuerung. Breitere Bereiche verwenden weiterhin das Raster und die nach Spaltenzahl gespeicherten Profile.

Der Layouteditor bleibt auf Smartphones und Tablets verfügbar. Touch-Größenregler und Entfernen-Schaltflächen bleiben sichtbar. Mit Hinzufügen im Elemente-Bereich ist kein Ziehen nötig; ein fokussiertes Widget wird mit Pfeiltasten verschoben und mit Umschalt plus Pfeiltasten skaliert. Abgebrochene Zeigergesten werden nicht übernommen. Verschachtelte Editoren nutzen die gesamte Breite; Größenänderungen erhalten bestehende Formularfelder.

Unter 900 CSS-Pixel öffnet sich die Werkzeugleiste als Seitenbereich. Filter und andere lokale Aktionen bleiben darin bedienbar; Navigation schließt ihn. Escape oder der Hintergrund schließen den Bereich und stellen den Fokus wieder her. Navigation, Werkzeugleiste, Suche und Dialoge teilen die Scrollsperre, damit verschachtelte Oberflächen die Seite nicht dauerhaft sperren oder hinter Dialogen scrollen lassen.

Die Arbeitsbereichseinführung markiert auf schmalen Bildschirmen die sichtbare Navigationsschaltfläche und erklärt Touch- und Tastatursteuerung. Browserregressionen prüfen 320, 390, 768, 1024 und 1440 CSS-Pixel, Drehung, Tastatureingabe und wiederholtes Einbinden. `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/responsive-browser.test.js` benötigt einen Rechner, auf dem Chromium starten kann. Emulation bestätigt weder iOS Safari noch installierte PWAs oder Bildschirmtastaturen auf echten Geräten.

Auf Smartphones teilen sich Marke und Seitentitel die erste Kopfzeile; Navigation und Kontosteuerung stehen in der zweiten. Der Untertitel bleibt für Hilfstechnologien verfügbar. Auf den kleinsten Bildschirmen lässt das Markensymbol Platz für lange Titel. Geschlossene Werkzeugleistenschalter scrollen unter der angehefteten Kopfzeile. Schwebende Aktionsmenüs verwenden kompakte Abstände und behalten 44 Pixel große Touchflächen. Tutorialaktionen haben einen deckenden Hintergrund und das Ziel eine deutliche Umrandung. Auf niedrigen Bildschirmen darf die Erklärung den Kopfbereich nutzen, ohne die Fußzeile zu verdecken. Mobiler Text folgt der gewählten Schrift und Größe, statt die gesamte Seite zu verkleinern.

Die gemeinsamen Kopfzeilen- und Tutorialtests laufen mit `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/*.test.js`. Für direkte und SPA-Navigation durch integrierte Seiten benötigt `COGNIS_CORE_BROWSER_URL` eine isolierte laufende Instanz und `COGNIS_BROWSER_CREDENTIALS` eine JSON-Datei mit `username`, `password` und `provider`. Anschließend `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/integration/core-pages-browser.test.js` ausführen. Die Tests erwarten ein eigenes Administratorkonto und aktivierte integrierte Gateways; Seiten externer Module sind ausgeschlossen.

## Anpassbare Arbeitsflächen

Der Page Composer steuert die Auswahl der Darstellung. Jede Elementfunktion erhält einen unveränderlichen Kontext mit `compact`, `layout`, `drawer` und `touch`. Entscheidend ist die innere Breite der Karte, einschließlich Änderungen durch Seitenleisten oder verschachtelte Layouts. Mit `responsive: true` erhält ein Element bei einem Darstellungswechsel neues Markup; normale zustandsbehaftete Elemente behalten ihren DOM. `onResize(presentation)` dient Geometrieanpassungen. Seitencode benötigt keine eigenen Bildschirmabfragen oder Größenereignisse.

Desktop-Werkzeugleisten verwenden eine begrenzte gemeinsame Spalte, damit für Inhalte genügend Platz bleibt. Die Spalte berücksichtigt die gewählte Textgröße; Telefone und Tablets nutzen die Composer-Seitenleiste.

Die gemeinsamen `layout`-Werte sind `compact` (bis 640px), `medium` (bis 900px) und `regular`, gemessen innerhalb der Karte. Dichte Flächen wie der Kalender nutzen in beiden eingeschränkten Darstellungen die Terminliste.

Die vom Composer verwalteten Attribute `data-composer-layout`, `data-composer-drawer` und `data-composer-touch` steuern Layout und Eingabe. Normale und verschachtelte Komposition erhalten denselben Kontext. Der Composer überwacht Inhalt und Karten, stellt Formularwerte wieder her und entfernt Beobachter und Ereignisbehandlung beim Verlassen der Seite.

Layoutänderungen melden sich über `onResize`; `onRender` bindet das Verhalten gerenderter Inhalte. Reine Layoutänderungen behalten die Ereignisbindung unveränderter Bedienelemente. Eine ausdrückliche Inhaltsaktualisierung initialisiert die gewählten Elemente einmal.

Für Bildschirmtests mit einer isolierten laufenden Instanz setzt du `COGNIS_BROWSER_TESTS=1`, `COGNIS_CORE_BROWSER_URL` und `COGNIS_BROWSER_CREDENTIALS`. Optional trennt `COGNIS_BROWSER_BYPASS_SERVICE_WORKER=1` die Darstellung vom Service-Worker-Cache; Offline- und PWA-Verhalten erfordern eigene Prüfungen.

## Seiten und Seitenleisten

Über das Seitenraster im Hauptkopf wechselst du zu anderen Bereichen. Die kompakte Seitenauswahl hält den Tastaturfokus und schließt mit Escape. Page Composer stellt für alle Seitenleisten dieselbe SVG-Schaltfläche mit doppeltem Winkel oben links bereit. Messages öffnet damit die Unterhaltungen.

`stackAt: "medium"` fordert bis zur gemeinsamen Tabletgrenze eine fließende einzelne Spalte an. `readingOrder` legt deren Elementreihenfolge fest, ohne gespeicherte Desktoplayouts zu ändern. Formularfelder und Entwürfe bleiben bei Layoutänderungen erhalten.

Feste Seiten mit einem Element können `fillViewport: true` verwenden. Composer berücksichtigt Kopfzeile, Fußzeile und sichtbaren Bildschirm mit mindestens 20rem. Composer stellt die gemeinsame Seitenleistenschaltfläche immer bereit. `openToolbar(trigger)` und `closeToolbar()` bleiben für gezielte Anwendungsaktionen verfügbar.

Gemeinsame Dialoge akzeptieren `surface: "reader"` für Leseinhalte. Die Fläche nutzt Composer-Darstellungshaken, hält Kopf- und Fußzeile außerhalb des scrollbaren Inhalts und beendet ihre Größenbeobachtung beim Schließen.

Kopf- und Fußzeile verwenden dieselbe Rahmenbreite. Ihre Außenkanten stimmen auf Telefonen, Tablets und Desktopbildschirmen überein.

Elemente können einen stabilen Bereich mit `data-composer-header` deklarieren. Composer platziert dort seine Seitenleistenschaltfläche und erhält dieselbe Schaltfläche samt Fokusverhalten bei Neuzeichnungen. Asynchron ersetzte Inhalte gehören in ein Kindelement dieses Bereichs. `data-composer-sidebar-trigger` kennzeichnet die gemeinsame Schaltfläche für Stile. Kalender und Messages gewinnen dadurch mehr Höhe für Inhalte.

Composer deaktiviert die automatische Scroll-Verankerung des Browsers im gesamten Rasterinhalt, damit sich verschachtelte Scroll-Positionen bei Breitenänderungen nicht verschieben. Die Inhaltskomponenten steuern das Scrollen beim Anfügen oder Ersetzen von Inhalten.

Die gemeinsamen Seitenabstände passen sich der Breite an. Auf dem Desktop bleibt ein einzelner Abstand zur Hauptfläche; die Schubladenbreite in rem berücksichtigt größere Schrift. Komponenten können ihre Bedienelemente passend dimensionieren und behalten ausreichend große Touch-Flächen.

Gemeinsame Seitenmenüeinträge kennzeichnen Auswahl und Tastaturfokus. Abstände und Scrollverhalten der Seitenleisten gehören zu Composer statt zu einzelnen Seiten.

Menüschaltflächen der Seitenleiste behalten transparente Ruheflächen sowie themengerechte Hover-, Auswahl- und Tastaturfokus-Stile. Formularfelder behalten ihre Feldstile, Aktionsschaltflächen ihre semantischen Farben. Helle Flächen verwenden eine mit der Textfarbe getönte Hover-Ebene.

## Composer-Flächen

Composer verwendet die Nachrichten-Fläche für Seitenleiste und Hauptinhalt. Jeder Toolbar-Beitrag erhält einen geschützten Rahmen `composer-sidebar-section`; sein äußerer Inhalt bleibt transparent und nutzt Composer-Abstände. Hauptkarten legen keine undurchsichtigen Hintergründe oder Schatten über die Fläche. Menüzeilen teilen Text-, Hover-, Auswahl- und Fokusdarstellung; ausdrückliche Bestätigungs-, Abbruch- und neutrale Bedienelemente behalten ihre semantischen Stile. Rahmenlose Einbettungen bleiben transparent. Seitenstile dürfen weder geschützte Flächenklassen überschreiben noch das gemeinsame Token `--toolbar-bg` setzen. Die Kaskadenebene `composerSurfaces` ist dem Host vorbehalten.

Composer verwaltet den Innenabstand der Inhaltssektion: 28px auf breiteren Bildschirmen und 14px bis einschließlich 640px, auch bei bildschirmfüllenden Seiten. Rahmenlose Einbettungen bleiben bündig. Listenhüllen in Seitenleisten bleiben transparent und ohne Innenabstand, damit Menüeinträge keine zusätzlichen Kartenflächen erhalten. Seitenstile dürfen weder `--composer-grid-inset` setzen noch die Host-Abstände überschreiben.
