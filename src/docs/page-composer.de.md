# Page Composer

## Überblick

`createPageComposer` ist das Layout-Orchestrierungsutility, das von allen Cognis-Seiten verwendet wird. Einzelne Seitenmodule deklarieren _was_ gerendert werden soll — eine Liste benannter Inhaltsblöcke, sogenannte Elemente — und der Composer übernimmt, _wie_ diese Blöcke angeordnet, persistiert, navigiert und neu gerendert werden.

Der dokumentierte Einstiegspunkt `createPageComposer` bleibt unterstützt und unverändert. Die Hilfsfunktion `createEditorPanelHandlers` auf niedriger Ebene benötigt jetzt die vom Composer verwaltete `state.editSession` statt separater Rückrufe zum Speichern und Beenden der Bearbeitung. Direkte Importe dieser Hilfsfunktion sollten zu `createPageComposer` wechseln oder ihre eigene Zusammensetzung zusammen mit derselben Core-Version aktualisieren.

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

Layouts verwenden `GET` und `PUT /api/v1/social/users/:account/preferences/:key`; `:key` ist der kodierte `preferenceKey`. Der PUT-Inhalt lautet `{ layout: { layoutsByGrid: { "cols-N": { placements: [{id, col, row, w, h}], hidden: [] } } } }`, wobei `N` die Spaltenzahl des Rasters bezeichnet. GET liefert die serialisierte Profilsammlung in `data.layoutJson`. Das Speichern eines Spaltenprofils erhält die übrigen Profile.

**Fertig** sendet eine unveränderliche Momentaufnahme des aktuellen Layouts. Im Haupteditor und in verschachtelten Editoren bleiben Bearbeitung und Schutz vor dem Verlassen aktiv, bis die Antwort den Erfolg bestätigt. Während Fertig oder **Zurücksetzen** des Layouts aussteht, sind Layoutänderungen und weitere Übermittlungen gesperrt, einschließlich Hinzufügen, Ausblenden, Verschieben, Größenänderung, Zurücksetzen und Verwerfen. Nach erfolgreichem Fertig endet die Bearbeitung; nach erfolgreichem Zurücksetzen wird das gesendete Standardlayout zur neuen gespeicherten Ausgangsbasis, während die Bearbeitung geöffnet bleibt.

Eine Speicherung gilt nur bei HTTP `200` mit JSON `data.saved === true` als bestätigt. Andere Antworten, einschließlich `202`, `204` und fehlerhaft aufgebauter Bestätigungen, belegen keinen Erfolg. Ohne Konto oder Zugriffstoken wird das Speichern ohne Schreibanfrage abgelehnt.

Fehlgeschlagene oder unbestätigte Speicherungen erhalten den geschützten Entwurf und zeigen in der zugehörigen Ansicht eine lokalisierte Toast-Meldung mit Handlungshinweisen. Nach Abschluss der Anfrage können Sie mit Fertig bewusst eine neue Anfrage senden oder den lokalen Entwurf verwerfen. Bei einem Anfrageabbruch oder einer verlorenen Antwort ist das Ergebnis auf dem Server unbekannt: Daraus folgt nicht, dass nichts geschrieben wurde. Verwerfen stellt die vorherige lokale Ausgangsbasis wieder her und macht einen möglichen Schreibvorgang auf dem Server nicht rückgängig. Diese Ausgangsbasis kann aus einem Standardlayout statt aus einem bestätigten Lesevorgang stammen. Fehlgeschlagene oder fehlerhafte anfängliche Lesevorgänge verwenden weiterhin die bisherige Ersatzdarstellung; diese belegt nicht den Serverzustand. Der Composer wiederholt Anfragen nicht automatisch und gleicht sie nicht durch erneutes Lesen ab. Eine reine Änderung der Ansichtsbreite speichert kein Layout.

Ein erhaltener verschachtelter Editor kann die Speicherung bei inaktiver Unterseite abschließen, ohne dort verspätete Meldungen anzuzeigen oder die Steuerelemente einer anderen Unterseite zu verändern. Nach dem vollständigen Abbau des Composers verändert ein späterer Abschluss die entfernte Ansicht nicht mehr.

Zusätzlich werden Formularentwürfe pro Benutzer, Seitenpfad und Composer-Schlüssel in `localStorage` gehalten. Dadurch bleiben Eingaben nach Seitenneuladen und responsiven Neu-Renderings erhalten. Die persistente Entwurfsspeicherung ist opt-in: Nur Felder, deren nächster Vorfahre `data-composer-include-form-memory="true"` trägt, werden in localStorage geschrieben. Felder ohne opt-in-Vorfahren werden dennoch im flüchtigen In-Memory-Snapshot erfasst, sodass sie responsive Neu-Renderings innerhalb derselben Sitzung überdauern, aber niemals in den persistenten Speicher geschrieben werden. Sensible Felder (`password`, `file`, `hidden` sowie Kennungen mit `password`/`secret`/`token`) sind unabhängig vom opt-in-Status stets von der persistierten Entwurfsspeicherung ausgeschlossen.

Karten mit größeren Formularen (mindestens 6 persistierbare Felder) zeigen eine Schaltfläche **Entwurf zurücksetzen**. Diese entfernt den gespeicherten Entwurf für die Karte und setzt die aktuellen Felder auf ihre Standardwerte zurück.

## Zeigersteuerung passend zum Thema

Die gemeinsame Zeigerstil-Schaltfläche verwendet die normale Themen-Vordergrundfarbe (`--text`) für Maus-, Laser- und Fadenkreuzsymbole, auch auf eingebetteten Komponentenseiten. Die Zeigerfarben der Teilnehmer bleiben unverändert.

## Responsives Layout

Page Composer verwendet die verfügbare Inhaltsbreite statt Gerätenamen. Bis 640 CSS-Pixel bilden gewöhnliche Karten eine spaltenbreite Leseansicht mit inhaltsabhängigen Zeilen; die Desktopanordnung bleibt erhalten. Rahmenlose eingebettete Oberflächen behalten ihre eigene Größensteuerung. Breitere Bereiche verwenden weiterhin das Raster und die nach Spaltenzahl gespeicherten Profile.

Der Layouteditor bleibt auf Smartphones und Tablets verfügbar. Touch-Größenregler und Entfernen-Schaltflächen bleiben sichtbar. Mit Hinzufügen im Elemente-Bereich ist kein Ziehen nötig; ein fokussiertes Widget wird mit Pfeiltasten verschoben und mit Umschalt plus Pfeiltasten skaliert. Abgebrochene Zeigergesten werden nicht übernommen. Verschachtelte Editoren nutzen die gesamte Breite; Größenänderungen erhalten bestehende Formularfelder.

Unter 900 CSS-Pixel öffnet sich die Werkzeugleiste als Seitenbereich. Filter und andere lokale Aktionen bleiben darin bedienbar; Navigation schließt ihn. Escape oder der Hintergrund schließen den Bereich und stellen den Fokus wieder her. Navigation, Werkzeugleiste, Suche und Dialoge teilen die Scrollsperre, damit verschachtelte Oberflächen die Seite nicht dauerhaft sperren oder hinter Dialogen scrollen lassen.

Die Arbeitsbereichseinführung markiert auf schmalen Bildschirmen die sichtbare Navigationsschaltfläche und erklärt Touch- und Tastatursteuerung. Browserregressionen prüfen 320, 390, 768, 1024 und 1440 CSS-Pixel, Drehung, Tastatureingabe und wiederholtes Einbinden. `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/responsive-browser.test.js` benötigt einen Rechner, auf dem Chromium starten kann. Emulation bestätigt weder iOS Safari noch installierte PWAs oder Bildschirmtastaturen auf echten Geräten.

## Ressourcen-Entwurfspfade

Der öffentliche Formularentwurfsmanager akzeptiert die optionale Abhängigkeit `resolveStoragePath(scopeKey)`. Ressourcenseiten können ihren kanonischen eigenen Pfad zurückgeben, damit Lesen, Speichern und Entfernen eines gesendeten Entwurfs auch nach einer Navigation dieselbe Ressource betreffen. Standardmäßig gilt weiterhin der aktuelle Seitenpfad. Das angemeldete Konto bleibt Bestandteil jedes Speicherschlüssels; die Auflösung ändert weder die Kontotrennung noch ausgeschlossene Felder.

## Native Layout-Aktionen

Die Haupt- und verschachtelten Layout-Panels verwenden native Steuerelemente vom Typ `button type="button"` für Fertig, Verwerfen und Zurücksetzen. Diese Aktionen senden kein umgebendes Formular ab und lösen keine Navigation aus. Laufende Layout-Speicherungen deaktivieren sie über die bestehende Editorsperre; fehlgeschlagene Speicherungen geben sie für einen ausdrücklichen neuen Versuch wieder frei. Fertig speichert weiterhin und schließt nach Bestätigung, Verwerfen stellt den lokalen Ausgangszustand ohne Schreibzugriff wieder her, und Zurücksetzen speichert das Standardlayout bei fortgesetzter Bearbeitung. Bestehende Aktionsklassen und das Ziel `#composer-edit-toggle` der Arbeitsbereichsanleitung bleiben unverändert.
