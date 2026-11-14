# Dokumentationsgruppen

**Feature-Zweig:** feature-docs-module-headings

## Dokumentationsgruppen

Öffne die Dokumentation, klappe eine Modulgruppe anhand ihres Anzeigenamens auf und wähle eine Seite. Module mit gleichem Anzeigenamen bleiben getrennte Gruppen. Suchbeschreibungen und Suchtext verwenden dieselben übersetzten Namen.

Nur noch archivierte Dokumente erhalten aktuelle Anzeigedaten, solange das zugehörige Manifest verfügbar ist. Fehlen Metadaten, bleibt die bisherige Kennung sichtbar; Dokumente, Versionen und Gruppierung bleiben erreichbar. Nach Entfernung eines Moduls wird kein veralteter übersetzter Name erfunden oder behalten.

## Technische Spezifikation

Der gemeinsame Export localizeModulePresentation in /static/reuse/presentation.js wird von Modulen und Dokumentation verwendet. Der vorhandene Namensschlüssel und die Katalog-URL werden ohne erfundene Schlüssel genutzt. Fehlende oder leere Werte der bevorzugten Sprache werden aus Englisch ergänzt. Fehlt auch der englische Wert, schlägt die Darstellung mit missing_translation fehl, statt einen Schlüssel oder Ersatztext anzuzeigen.

Sprachkatalog-URLs müssen kanonische Pfade unter /static/modules/{id}/ mit nichtleeren öffentlichen Pfadsegmenten sein, ohne Verzeichniswechsel, Abfrage, Fragment oder externe Herkunft. Nichttextuelle URLs und fehlerhafte Deskriptoren werden vor der Übersetzung zurückgewiesen. Installierte Manifeste ohne deklarierte URL nutzen /static/modules/{id}/languages; der Host löst diese Route auch vor der Modulinitialisierung zum UUID-eigenen UI-Verzeichnis auf.

Unbrauchbare optionale Manifestdaten, JSON-Strukturen oder Sprachdeskriptoren werden mit einer strukturierten Diagnose aus Gruppenkennung und sicherem Grund ausgelassen. Andere gültige Dokumente bleiben mit ihrer ursprünglichen Identität verfügbar. Unerwartete Dateisystemfehler werden weiterhin weitergegeben. Diese Metadatenbehandlung fängt niemals fehlende deklarierte Übersetzungsschlüssel ab.

Versionsangaben gelten für explizite und konventionelle Kataloge, sodass ein Modulupdate die übersetzten Namen beim nächsten Seitenaufruf aktualisiert. Seite und globale Suche verwenden die aktive Anzeigesprache, auch wenn sie von der gespeicherten Sprachreihenfolge abweicht. Die Hintergrundsuche verändert diese Einstellungen nicht.

Die Inhaltsrevision ändert sich auch, wenn veröffentlichte Prüfsummen der Sprachdateien bei gleicher Softwareversion wechseln. Dadurch werden Namen nach Updates außerhalb des aktuellen Tabs aktualisiert, ohne Installationszustand offenzulegen. Nicht deklarierte Änderungen der Sprachdateien benötigen die übliche Cache-Invalidierung des Modullebenszyklus.

Veröffentlichte Vorabversionskennungen bleiben für Anzeigerevisionen gültig, auch bei ausschließlich archivierten Dokumenten. Unabhängige veröffentlichte Dateien, auch mit Leerzeichen oder nichtlateinischen Zeichen im Namen, beeinflussen weder Sprachprüfung noch Sprachprüfsumme.

## Commits

- [215f842f7e7ce230d29c27c47b40ef12976c2372](https://github.com/Cognis-Labs-HQ/Cognis/commit/215f842f7e7ce230d29c27c47b40ef12976c2372)
- [25a87fd0684de8205bc8310ce0e2cd17397a76b0](https://github.com/Cognis-Labs-HQ/Cognis/commit/25a87fd0684de8205bc8310ce0e2cd17397a76b0)
- [13a45bbe7ec03660fc40d0cc06934fef7cf6b3d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/13a45bbe7ec03660fc40d0cc06934fef7cf6b3d9)
- [f7a840d84e9dda280de54dd84e08519ed35a0a13](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7a840d84e9dda280de54dd84e08519ed35a0a13)
- [d66a4fdeccb120a7d39837df821b15e29db48143](https://github.com/Cognis-Labs-HQ/Cognis/commit/d66a4fdeccb120a7d39837df821b15e29db48143)
- [5995ab80c44feb429ec0afd1ad046b76f1834a1e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5995ab80c44feb429ec0afd1ad046b76f1834a1e)
