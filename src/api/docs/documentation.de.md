# Dokumentationsgruppen

Öffne die Dokumentation, klappe eine Modulgruppe anhand ihres Anzeigenamens auf und wähle eine Seite. Module mit gleichem Anzeigenamen bleiben getrennte Gruppen. Suchbeschreibungen und Suchtext verwenden dieselben übersetzten Namen.

## Anwendungsbeispiele

GET /api/v1/docs liefert optional groupPresentation neben den bisherigen Feldern group, slug, title, path und versions. Die Gruppe bleibt die unveränderliche Modul-UUID; Beschriftungen ersetzen weder Identität noch Routen.

## Technische Spezifikation

Die Dokumentation liest das öffentliche Manifest im zugehörigen Quellverzeichnis. Die Manifest-UUID muss zur Gruppe passen und kanonische Pfade müssen innerhalb dieses Eigentümers bleiben. Ausgegeben werden nur id, name, ui.stringsBaseUrl und ui.stringsRevision als Prüfsumme aus validierter Version und sortierten veröffentlichten SHA-256-Einträgen der Sprachdateien. Konfiguration, Zugangsdaten, Laufzeitstatus und administrative Katalogdaten gehören nicht zur Antwort. Zusätzliche Anmeldung oder administrative Endpunkte sind nicht nötig.

Der gemeinsame Export localizeModulePresentation in /static/reuse/presentation.js wird von Modulen und Dokumentation verwendet. Der vorhandene Namensschlüssel und die Katalog-URL werden ohne erfundene Schlüssel genutzt. Fehlende oder leere Werte der bevorzugten Sprache werden aus Englisch ergänzt. Fehlt auch der englische Wert, schlägt die Darstellung mit missing_translation fehl, statt einen Schlüssel oder Ersatztext anzuzeigen.

Nur noch archivierte Dokumente erhalten aktuelle Anzeigedaten, solange das zugehörige Manifest verfügbar ist. Fehlen Metadaten, bleibt die bisherige Kennung sichtbar; Dokumente, Versionen und Gruppierung bleiben erreichbar. Nach Entfernung eines Moduls wird kein veralteter übersetzter Name erfunden oder behalten.

Die Anleitung hebt weiterhin Navigation, aktuelles Dokument und Versionslinks hervor. Der Navigationsschritt erklärt Gruppen nach Anzeigenamen. Der Aufklappzustand bleibt über die stabile Gruppenkennung erhalten; ein während des Ladens von Übersetzungen abgebrochener Seitenaufbau veröffentlicht kein Menü.

Sprachkatalog-URLs müssen kanonische Pfade unter /static/modules/{id}/ mit nichtleeren öffentlichen Pfadsegmenten sein, ohne Verzeichniswechsel, Abfrage, Fragment oder externe Herkunft. Nichttextuelle URLs und fehlerhafte Deskriptoren werden vor der Übersetzung zurückgewiesen. Installierte Manifeste ohne deklarierte URL nutzen /static/modules/{id}/languages; der Host löst diese Route auch vor der Modulinitialisierung zum UUID-eigenen UI-Verzeichnis auf.

Unbrauchbare optionale Manifestdaten, JSON-Strukturen oder Sprachdeskriptoren werden mit einer strukturierten Diagnose aus Gruppenkennung und sicherem Grund ausgelassen. Andere gültige Dokumente bleiben mit ihrer ursprünglichen Identität verfügbar. Unerwartete Dateisystemfehler werden weiterhin weitergegeben. Diese Metadatenbehandlung fängt niemals fehlende deklarierte Übersetzungsschlüssel ab.

Versionsangaben gelten für explizite und konventionelle Kataloge, sodass ein Modulupdate die übersetzten Namen beim nächsten Seitenaufruf aktualisiert. Seite und globale Suche verwenden die aktive Anzeigesprache, auch wenn sie von der gespeicherten Sprachreihenfolge abweicht. Die Hintergrundsuche verändert diese Einstellungen nicht.

Die Inhaltsrevision ändert sich auch, wenn veröffentlichte Prüfsummen der Sprachdateien bei gleicher Softwareversion wechseln. Dadurch werden Namen nach Updates außerhalb des aktuellen Tabs aktualisiert, ohne Installationszustand offenzulegen. Nicht deklarierte Änderungen der Sprachdateien benötigen die übliche Cache-Invalidierung des Modullebenszyklus.

Veröffentlichte Vorabversionskennungen bleiben für Anzeigerevisionen gültig, auch bei ausschließlich archivierten Dokumenten. Unabhängige veröffentlichte Dateien, auch mit Leerzeichen oder nichtlateinischen Zeichen im Namen, beeinflussen weder Sprachprüfung noch Sprachprüfsumme.
