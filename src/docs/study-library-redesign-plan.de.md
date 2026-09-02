# Plan für das Beziehungsframework der Studienbibliothek

## Zielrichtung

Der feste Schichtenkatalog wird durch eine von Verbrauchern verwaltete Schemaregistrierung ersetzt. Sprachmodule registrieren über `ctx` ein versioniertes Bibliotheksschema; der Adapter kennt weder Alphabet, Hangul-Blöcke, Wörter noch Übungen. Er stellt Speicherung, Beziehungsprüfung, Auflösungsabläufe, Zugriffskontrolle und generische UI-Metadaten bereit.

Ein Schema beschreibt stabile Schicht-IDs, lokalisierte Bezeichnungen, Felder und gerichtete Beziehungen mit Kardinalität, Reihenfolge, Pflichtstatus, Löschverhalten und zulässigen Resolvern. Verwendete Schemaversionen bleiben unveränderlich; Strukturänderungen erfolgen über veröffentlichte Migrationen.

## Verträge und Datenmodell

1. Das Study-Gateway erhält eine `study:library`-Fähigkeit zur Schemaregistrierung. Sie verwirft doppelte IDs, ungültige Ziele, unzulässige Zyklen, unmögliche Kardinalitäten und Versionsrückschritte.
2. Erstellen, Ändern, Löschen, Auflösen, Nachschlagen, Importieren, Exportieren und Migrieren werden benannte `ctx`-Flows mit entfernbaren Stufen. Der Adapter liefert Autorisierung, Validierung, Persistenz und Auditierung; Verbraucher liefern Normalisierung und Resolver.
3. Ein neutraler Lookup-Vertrag lässt Anbieter unterstützte Sprachen, Schemata, Schichten und Felder ankündigen. Vorschläge enthalten Herkunft und Konfidenz und werden erst nach Annahme gespeichert. Der Adapter importiert niemals Jisho oder einen konkreten Anbieter.
4. Persistiert werden Schemaversionen, generische Einträge, typisierte Felder, geordnete Kanten, alternative Definitionen und Herkunft. Schichtnamen erscheinen nicht in Tabellen oder Service-Verzweigungen.
5. Prüfungen erzwingen Zielschicht, Kardinalität, Eindeutigkeit, Reihenfolge, Sprachregeln, Sichtbarkeit und Löschregeln atomar. Alternative Definitionen sind normale, über deklarierte Beziehungen verbundene Einträge.

## Auflösung und Oberfläche

Unicode-Grapheme bilden nur die generische Grundlage. Verbraucher können Longest-Match- und rekursive Resolver beitragen, etwa für englische Buchstaben, koreanische Jamo und Silbenblöcke oder japanische Kana und Kanji. Mehrdeutige Bestandteile werden nie still erzeugt: Der Dienst liefert gewichtete Vorschläge und nicht aufgelöste Bereiche. Sätze entstehen aus ausdrücklich ausgewählten, geordneten Wortblöcken; die Kantenreihenfolge ist maßgeblich.

Die adaptereigene, mit `createPageComposer` gebaute Oberfläche erzeugt Navigation und Formulare aus dem Schema. Sie umfasst Suche und Filter, Detailansichten für jeden Eintrag, eingehende und ausgehende Beziehungen, alternative Definitionen, Herkunft, Editoren mit Kardinalitätsfeedback, Resolver-Vorschauen, Lookup-Prüfung und einen Satz-Blockeditor. Kanonische URLs wie `/study/library/:schemaId/:layerId/:entryId` funktionieren beim direkten Laden und über den App-Router. Browserzugriffe laufen über den UI-Client des Study-Gateways.

## Lieferfolge und Abnahmekriterien

Zuerst werden Vertragsfixtures für Englisch, Koreanisch und Japanisch sowie Fehler-, Rechte- und Mehrdeutigkeitsfälle erstellt. Danach folgen Registry und Typen, generische Speicherung mit rücksetzbarer Migration, Flow-Orchestrierung, Resolver, Gateway-API und Client, die vollständige barrierefreie UI und schließlich Dual-Read-Vergleich und Entfernung der festen Schichten.

Fertig ist die Neugestaltung, wenn unbekannte Strukturen ohne Adapteränderung registriert werden können, kein Schreibpfad ungültige Kanten speichert, Englisch und Koreanisch korrekt aufgelöst werden, Sätze ihre Identität aus geordneten Blöcken beziehen, Lookup-Anbieter ausschließlich über `ctx` austauschbar sind, jeder Eintrag eine neu ladbare Detail-URL besitzt und Migrationen IDs, Beziehungen, Herkunft und Bereiche verlustfrei zurücksetzen können.
