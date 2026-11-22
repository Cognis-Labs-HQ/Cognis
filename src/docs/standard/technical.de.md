# Dokumentationsverträge

Dokumentation trennt Einführung, praktische Abläufe und technische Referenz, damit Leser die passende Detailtiefe wählen können.

## Schnittstellen

Jede Komponente deklariert `documentation.readme`, `documentation.usage` und `documentation.technical` mit `docs/README.en.md`, `docs/USAGE.en.md` und `docs/TECHNICAL.en.md`. Jede Sprache behält ihr Suffix: `.en`, `.de`, `.id` oder `.ja`. Manifestpfade benennen das englische Mitglied einer lokalisierten Dokumentfamilie statt einer festen Anzeigesprache. Kernthemen werden aus Verzeichnissen mit `index.<locale>.md`, `usage.<locale>.md` und `technical.<locale>.md` erkannt.

## Konfiguration

Führen Sie `npm run check:docs` aus. PR-CI vergleicht neue Änderungsdateien zusätzlich mittels `--base` und `--branch` mit dem Quellzweig. Genau ein viersprachiger Änderungssatz ist erlaubt.

## Verhalten

### Grenze der Protokollierung

JavaScript und TypeScript der Anwendung sowie eingebettete Browserskripte und Ereignishandler veröffentlichen Diagnoseereignisse über die injizierte Log-Funktion oder den öffentlichen Browser-Diagnoseport. Nativer Konsolenzugriff ist auf die Protokollausgabeadapter und die Initialisierung des Logging-Gateways beschränkt. Andere Handler in derselben Datei erhalten keine Ausnahme. Befehls- und Buildberichte verwenden ausdrückliche Terminalausgaben. Die Prüfung nativer Konsolenzugriffe umfasst auch Werkzeugquellen; Test-Fixtures gehören nicht zum Produktionscode.

Mit `node --import tsx --test src/tooling/tests/logging/*.test.js` werden das Repository und die Erkennungsfälle geprüft. Die Prüfung umfasst installierte externe Module, berücksichtigt `COGNIS_EXTERNAL_MODULES_ROOT` und meldet Datei und Zeile. Aliase, berechnete Zugriffe und `node:console`-Importe sind ohne Bestandsschutz verboten.

Ein neues Thema öffnet Info. Info, Anwendung und Technik gehören zu einer Komponentenversion. Der Server liest alle Quelldateien vor der atomaren Veröffentlichung; fehlende Ansichten oder unvollständige Übersetzungen verhindern sie. Ansichtswechsel behalten die Version; historische Pakete bleiben nach dem Entfernen der Komponente lesbar.

Inhalte, Navigationstitel und Suche bevorzugen die aktive UI-Sprache, danach konfigurierte Ausweichsprachen und Englisch. Dies gilt einheitlich für Info, Nutzung und Technik sowie archivierte Versionen.

## Sicherheit

Dokumentation ist öffentlich: Zugangsdaten, private Kontodaten und Betriebsgeheimnisse gehören nicht hinein. Manifestverweise verbleiben im eigenen Dokumentationsbereich. Die Kernerkennung liest Verzeichnispakete statt beliebiger Markdown-Dateinamen.

## Referenz

README erklärt Zweck, Aufgaben, Zugriff und Einstieg ohne Endpunktdefinitionen oder Implementierungscode. USAGE bietet echte Abläufe oder öffentliche Beispiele, Voraussetzungen, erwartete Ergebnisse und Fehlerbehebung. TECHNICAL behandelt Schnittstellen, Konfiguration, Verhalten, Sicherheit und Referenzen.

Die exakten übersetzten H2-Namen und ihre Reihenfolge stehen in `src/tooling/reuse/documentation/structure.json`. Verwenden Sie eine H1 mit höchstens 30 Zeichen und eine Einleitung. Leere oder zusätzliche Abschnitte, offene Vorlagen, unausgeglichene Codeblöcke und übersprungene Überschriftenebenen sind Fehler. Vorlagen liegen unter `.github/documentation/`.

Beschreiben Sie unterstütztes Verhalten im passenden Abschnitt. Veröffentlichungsgeschichte und Implementierungsabläufe gehören ausschließlich in das Zweigprotokoll. Gemeinsame technische Absätze haben einen Eigentümer; andere Dokumente verweisen dorthin.

Komponentenressourcen verwenden ihr eigenes öffentliches statisches Präfix. Eine ausschließlich von einer Komponente mit eigenem Ressourcenbereich verwendete Datei darf nicht im Kern liegen. Kernressourcen und gemeinsame Dateien bleiben dort. CSS-Importe bilden einen zusammenhängenden alphabetischen Block mit einer Leerzeile vor Stilregeln.

Fülle jede Rolle mit nützlichen, am Quellcode geprüften Informationen statt Standardtext. Prüfe Methoden, Pfade, Felder, Rechte, Standardwerte, Persistenz und unvollständige Integrationen beim Eigentümer. Abläufe gehören in Nutzung, Implementierungsverträge in Technik. Prüfungen erkennen allgemeine Platzhalter und fehlende Quellen, beweisen aber nicht beliebige Prosa.

GitHub-Quelldateilinks verwenden den Standardzweig-Alias `blob/HEAD` oder `raw/HEAD`, auch in archivierten Dokumenten. Commit-Links in Änderungsprotokollen behalten ihre unveränderlichen Ziele.
