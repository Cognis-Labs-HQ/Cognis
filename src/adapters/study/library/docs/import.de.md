# Bibliotheksimport

## Verwendung

Mit **Importieren** unten links in der Kartentypauswahl lässt sich JSON hochladen. Wählen Sie einen beschreibbaren Bereich für den gesamten Stapel. Das Format enthält `format: "cognis-library"`, `version: 1` und ein nicht leeres Array `entries`.

## Technische Spezifikation

Jeder Eintrag benötigt einen eindeutigen lokalen `key`, ein installiertes `schemaId`, eine `layer`, ein `label` und alle Pflichtfelder und Beziehungen der Ebene. Cognis verwendet Konstruktorvorgaben und die aktuelle Schemaversion. Lokalisierungsschlüssel für Definitionen werden automatisch erzeugt. Elementare Zeichen und Partikel bleiben Inhaltsanbietern vorbehalten. Strichmuster müssen dem validierten strukturierten Format des Editors entsprechen.

```json
{
    "format": "cognis-library",
    "version": 1,
    "entries": [
        {
            "key": "room-definition",
            "schemaId": "japanese-core",
            "layer": "definitions",
            "label": "room",
            "fields": {
                "translations": {
                    "en": "room"
                }
            }
        },
        {
            "key": "classroom",
            "schemaId": "japanese-core",
            "layer": "words",
            "label": "教室",
            "fields": {
                "pronunciation": ["きょうしつ"]
            },
            "references": [
                {
                    "relation": "definitions",
                    "entryId": "room-definition"
                }
            ]
        }
    ]
}
```

In `references` und `referenceGroups` kann `entryId` den `key` eines anderen Eintrags enthalten. Cognis vergibt UUIDs vorab, ersetzt diese Schlüssel und verarbeitet verfügbare Abhängigkeiten in Ebenenstapeln. Bestehende UUIDs müssen im Zielbereich sichtbar sein. Fehlende Ziele, falsche Ebenen, Zyklen, ungültige Striche, fehlende Pflichtfelder oder doppelte Inhalte verwerfen die gesamte Transaktion. Die Antwort enthält Einträge und die UUID-Zuordnung `ids`.

Pro Karte sind höchstens 8 Tags, 16 Aussprachen und 10 Definitionen erlaubt; Feldlängen und Beziehungsmengen gelten zusätzlich. JSON-Importe prüfen diese Grenzen. Wörterbuchimporte begrenzen überzählige Werte vor dem Übernehmen. Der Editor verhindert eine elfte Definition.
