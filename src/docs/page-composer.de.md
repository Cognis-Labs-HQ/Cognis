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
