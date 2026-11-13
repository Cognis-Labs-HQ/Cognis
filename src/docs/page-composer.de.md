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

Array-Angaben unterstützen `['full', 'fill']` für die gesamte Breite und das Ausfüllen der verfügbaren Höhe sowie `['full', n]` für die gesamte Breite mit einer numerischen Höhenbegrenzung. Haupt- und verschachtelte Composer berücksichtigen diese Maße in schmalen und breiten Rastern. Beim Ziehen unter das Raster erweitert der Editor die Inhaltsgrenzen und das sichtbare Raster gemeinsam, bevor das Widget abgelegt wird.

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

DOM-Parking ist standardmäßig deaktiviert. Setzen Sie `enableDomParking: true` im Page Composer nur dann, wenn Medien-DOM Composer-Neudarstellungen überstehen muss. Ist die Option aktiv, werden Karten mit Iframes oder anderen Medien als intaktes DOM geparkt und wiederhergestellt; dies ist für zustandsbehaftete Einbettungen wie Jitsi Meet gedacht. Normale Seiten sollten neu gerendert werden und die temporäre Formularzustandswiederherstellung nutzen, damit aktualisierte Inhalte nicht durch einen veralteten geparkten Baum verdeckt werden. Jeder Aufruf von `refresh()` rendert standardmäßig alle vorhandenen sichtbaren Karten neu, damit Zustandsänderungen ohne seitenspezifischen DOM-Austausch erscheinen.

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
