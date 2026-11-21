# Dokumentationsverträge

Dokumentation trennt Einführung, praktische Abläufe und technische Referenz, damit Leser die passende Detailtiefe wählen können.

## Schnittstellen

Jede Komponente deklariert `documentation.readme`, `documentation.usage` und `documentation.technical` mit `docs/README.md`, `docs/USAGE.md` und `docs/TECHNICAL.md`. Englisch hat kein Sprachsuffix; Übersetzungen verwenden `.de`, `.id` oder `.ja`. Kernthemen werden aus Verzeichnissen mit `index.<locale>.md`, `usage.<locale>.md` und `technical.<locale>.md` erkannt.

## Konfiguration

Führen Sie `npm run check:docs` aus. PR-CI vergleicht neue Änderungsdateien zusätzlich mittels `--base` und `--branch` mit dem Quellzweig. Genau ein viersprachiger Änderungssatz ist erlaubt.

## Verhalten

Ein neues Thema öffnet Info. Info, Anwendung und Technik gehören zu einer Komponentenversion. Der Server liest alle Quelldateien vor der atomaren Veröffentlichung; fehlende Ansichten oder unvollständige Übersetzungen verhindern sie. Ansichtswechsel behalten die Version; historische Pakete bleiben nach dem Entfernen der Komponente lesbar.

## Sicherheit

Dokumentation ist öffentlich: Zugangsdaten, private Kontodaten und Betriebsgeheimnisse gehören nicht hinein. Manifestverweise verbleiben im eigenen Dokumentationsbereich. Die Kernerkennung liest Verzeichnispakete statt beliebiger Markdown-Dateinamen.

## Referenz

README erklärt Zweck, Aufgaben, Zugriff und Einstieg ohne Endpunktdefinitionen oder Implementierungscode. USAGE bietet echte Abläufe oder öffentliche Beispiele, Voraussetzungen, erwartete Ergebnisse und Fehlerbehebung. TECHNICAL behandelt Schnittstellen, Konfiguration, Verhalten, Sicherheit und Referenzen.

Die exakten übersetzten H2-Namen und ihre Reihenfolge stehen in `src/tooling/reuse/documentation/structure.json`. Verwenden Sie eine H1 mit höchstens 30 Zeichen und eine Einleitung. Leere oder zusätzliche Abschnitte, offene Vorlagen, unausgeglichene Codeblöcke und übersprungene Überschriftenebenen sind Fehler. Vorlagen liegen unter `.github/documentation/`.

Beschreiben Sie unterstütztes Verhalten im passenden Abschnitt. Veröffentlichungsgeschichte und Implementierungsabläufe gehören ausschließlich in das Zweigprotokoll. Gemeinsame technische Absätze haben einen Eigentümer; andere Dokumente verweisen dorthin.

Komponentenressourcen verwenden ihr eigenes öffentliches statisches Präfix. Eine ausschließlich von einer Komponente mit eigenem Ressourcenbereich verwendete Datei darf nicht im Kern liegen. Kernressourcen und gemeinsame Dateien bleiben dort. CSS-Importe bilden einen zusammenhängenden alphabetischen Block mit einer Leerzeile vor Stilregeln.
