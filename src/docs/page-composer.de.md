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

DOM-Parking ist standardmäßig deaktiviert. Setzen Sie `enableDomParking: true` im Page Composer nur dann, wenn Medien-DOM Composer-Neudarstellungen überstehen muss. Ist die Option aktiv, werden Karten mit Iframes oder anderen Medien als intaktes DOM geparkt und wiederhergestellt; dies ist für zustandsbehaftete Einbettungen wie Jitsi Meet gedacht. Normale Seiten sollten neu gerendert werden und die temporäre Formularzustandswiederherstellung nutzen, damit aktualisierte Inhalte nicht durch einen veralteten geparkten Baum verdeckt werden.

### Persistenz

Layouts werden weiterhin über die Präferenzen-API unter `preferenceKey` gespeichert. Zusätzlich werden Formularentwürfe pro Benutzer, Seitenpfad und Composer-Schlüssel in `localStorage` gehalten. Dadurch bleiben Eingaben nach Seitenneuladen und responsiven Neu-Renderings erhalten. Die persistente Entwurfsspeicherung ist opt-in: Nur Felder, deren nächster Vorfahre `data-composer-include-form-memory="true"` trägt, werden in localStorage geschrieben. Felder ohne opt-in-Vorfahren werden dennoch im flüchtigen In-Memory-Snapshot erfasst, sodass sie responsive Neu-Renderings innerhalb derselben Sitzung überdauern, aber niemals in den persistenten Speicher geschrieben werden. Sensible Felder (`password`, `file`, `hidden` sowie Kennungen mit `password`/`secret`/`token`) sind unabhängig vom opt-in-Status stets von der persistierten Entwurfsspeicherung ausgeschlossen.

Karten mit größeren Formularen (mindestens 6 persistierbare Felder) zeigen eine Schaltfläche **Entwurf zurücksetzen**. Diese entfernt den gespeicherten Entwurf für die Karte und setzt die aktuellen Felder auf ihre Standardwerte zurück.
