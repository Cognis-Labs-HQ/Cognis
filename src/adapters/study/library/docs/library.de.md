# Bibliotheksadapter

## Verbraucherdefinierte Schemata

Der Bibliotheksadapter speichert generische, verknüpfte Lerninhalte. Verbraucher registrieren unveränderliche, versionierte Schemata über die ctx-Fähigkeit `study:library`. Ein Schema beschreibt Sprache, Ebenen, typisierte Felder und gerichtete Beziehungen; Begriffe wie Alphabet, Wort oder Satz sind nicht im Adapter festgelegt.

Beziehungen bestimmen Zielebene, Kardinalität, Reihenfolge und optionalen Resolver. Jeder Schreibvorgang prüft Felder, Schemaversion, Ziele, Sichtbarkeit und Kardinalität. Alternative Definitionen werden als vom Verbraucher deklarierte Ebenen und Beziehungen modelliert.

## Auflösung, API und UI

Der `grapheme`-Resolver nutzt Unicode-Grapheme; `longest-match` verarbeitet ausdrücklich getrennte Blöcke. Beide liefern Vorschläge und ungelöste Einheiten, ohne still Einträge anzulegen. Lookup-Anbieter werden über `registerLookupProvider` beigetragen, liefern gewichtete Vorschläge mit Herkunft und lassen sich über den zurückgegebenen Callback entfernen. Erstellen, Auflösen und Nachschlagen laufen durch benannte ctx-Flows.

Das Study-Gateway bietet Schemaerkennung, Auflistung, Erstellung, Details, beidseitige Verfolgung, Auflösungsvorschau und Lookup-Vorschläge. Jeder Eintrag besitzt die Direktadresse `/study/library/:schemaId/:layerId/:entryId`. Die schemagesteuerte Oberfläche zeigt lokalisierte Ebenen, Felder und Beziehungen. Global-, Benutzer- und Klassenzugriff wird weiterhin am Service-Rand durchgesetzt.
