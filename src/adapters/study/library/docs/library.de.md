# Bibliotheksadapter

## Verbraucherdefinierte Schemata

Der Bibliotheksadapter speichert generische, verknüpfte Lerninhalte. Verbraucher registrieren unveränderliche, versionierte Schemata über die ctx-Fähigkeit `study:library`. Ein Schema beschreibt Sprache, Ebenen, typisierte Felder und gerichtete Beziehungen; Begriffe wie Alphabet, Wort oder Satz sind nicht im Adapter festgelegt.

Beziehungen bestimmen Zielebene, Kardinalität, Reihenfolge und optionalen Resolver. Jeder Schreibvorgang prüft Felder, Schemaversion, Ziele, Sichtbarkeit und Kardinalität. Alternative Definitionen werden als vom Verbraucher deklarierte Ebenen und Beziehungen modelliert.

## Auflösung, API und UI

Der `grapheme`-Resolver nutzt Unicode-Grapheme; `longest-match` verarbeitet ausdrücklich getrennte Blöcke. Beide liefern Vorschläge und ungelöste Einheiten, ohne still Einträge anzulegen. Lookup-Anbieter werden über `registerLookupProvider` beigetragen, liefern gewichtete Vorschläge mit Herkunft und lassen sich über den zurückgegebenen Callback entfernen. Erstellen, Auflösen und Nachschlagen laufen durch benannte ctx-Flows.

Das Study-Gateway bietet Schemaerkennung, Auflistung, Erstellung, Details, beidseitige Verfolgung, Auflösungsvorschau und Lookup-Vorschläge. Die schemagesteuerte Oberfläche blendet interne Definitions- und Partikelebenen beim direkten Browsen aus. Sichtbare Ebenen verwenden Reiter, Metadatenfilter, Eintragskarten, Metadaten-Pills und Bereichssymbole. Wiederverwendbare Pop-up-Details zeigen Definitionen und Bedeutungen unter der größeren Eintragsüberschrift. Erkannte Bestandteile, einschließlich Satzpartikeln, erscheinen als navigierbare Unterfelder innerhalb dieser Überschrift statt in einem separaten Komponentenabschnitt; Partikeldetails bleiben schreibgeschützt. Filterauswahlen verwenden die gemeinsame Theme-Gestaltung und werden sofort angewendet. Global-, Benutzer- und Klassenzugriff wird weiterhin am Service-Rand durchgesetzt.

## Deklarative Inhaltspakete

Installierte Sprachpakete rufen `inspectContentPack(root)` zur Prüfung oder `ingestContentPack(root)` zur Installation einer reinen Datenbibliothek auf. Das Verzeichnis enthält `manifest.json`, eine referenzierte Schemadatei und ein Inhaltsverzeichnis mit Ebenen-Unterverzeichnissen. Dateien enthalten Datensatzarrays mit stabilen IDs und ausdrücklichen Beziehungen. Cognis prüft den vollständigen Graphen, erzeugt Namensraum-IDs, erfasst Digest und Beleg und schreibt Schema, Einträge und Kanten atomar. Der Autorenvertrag steht in `study-language-framework.de.md`.

## Lokalisierte Definitionen

Jede Ebene mit der semantischen Rolle `definition` deklariert ihr moduleigenes Zeichenkettenpräfix sowie ihre Felder für Schlüssel und lokalisierten Text. Definitionen werden nur beim Bearbeiten der Einträge verwaltet, die sie benötigen; sie sind nicht als eigenständige Bibliotheksbereiche direkt sichtbar oder bearbeitbar. Englisch bleibt der erforderliche Ausgangstext, erzeugte Schlüssel bleiben im Definitionsdatensatz und die optionale Fähigkeit `localization:translateString` kann fehlende Sprachen ergänzen.
