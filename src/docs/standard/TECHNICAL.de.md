# Dokumentationsverträge

Dokumentpakete trennen Einführung, ausführbare Abläufe und technische Verträge mit geprüfter Struktur und lokalisierten Quelldateien.

## Schnittstellen

Jede Komponente deklariert `documentation.readme`, `documentation.usage` und `documentation.technical` mit `docs/README.en.md`, `docs/USAGE.en.md` und `docs/TECHNICAL.en.md`. Jede Sprache behält ihr Suffix: `.en`, `.de`, `.id` oder `.ja`. Manifestpfade benennen das englische Mitglied einer lokalisierten Dokumentfamilie statt einer festen Anzeigesprache. Kernthemen werden aus Verzeichnissen mit `INFO.<locale>.md`, `USAGE.<locale>.md` und `TECHNICAL.<locale>.md` erkannt.

Dokumentbasenamen sind großgeschrieben und unterscheiden Groß- und Kleinschreibung. Klein- oder gemischtgeschriebene Varianten von INFO, README, USAGE und TECHNICAL werden auch dann abgelehnt, wenn eine korrekt benannte Datei vorhanden ist.

### Verbindliche Gliederung

Verwenden Sie genau die folgenden H2-Überschriften in dieser Reihenfolge für die jeweilige Dokumentsprache. Info verwendet die README-Gliederung, auch bei INFO-Dateien im Kern. Bezeichner bleiben unverändert; alternative Überschriften sind nicht zulässig.

| Sprache | Info / README                                                                            | Anwendung                                                                   | Technik                                                                      |
| ------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| en      | `What You Can Do` → `Before You Start` → `Get Started` → `Learn More`                    | `Prerequisites` → `Examples` → `Expected Results` → `Troubleshooting`       | `Interfaces` → `Configuration` → `Behavior` → `Security` → `Reference`       |
| de      | `Möglichkeiten` → `Vor dem Start` → `Erste Schritte` → `Weitere Informationen`           | `Voraussetzungen` → `Beispiele` → `Erwartete Ergebnisse` → `Fehlerbehebung` | `Schnittstellen` → `Konfiguration` → `Verhalten` → `Sicherheit` → `Referenz` |
| id      | `Yang Dapat Anda Lakukan` → `Sebelum Memulai` → `Langkah Awal` → `Pelajari Lebih Lanjut` | `Prasyarat` → `Contoh` → `Hasil yang Diharapkan` → `Pemecahan Masalah`      | `Antarmuka` → `Konfigurasi` → `Perilaku` → `Keamanan` → `Referensi`          |
| ja      | `できること` → `始める前に` → `はじめに` → `詳しい情報`                                  | `前提条件` → `使用例` → `期待される結果` → `問題の解決`                     | `インターフェース` → `設定` → `動作` → `セキュリティ` → `リファレンス`       |

Beginnen Sie mit genau einem nicht eingerückten `# Titel` mit höchstens 30 Zeichen, einer Leerzeile und einem informativen Einleitungsabsatz. Danach folgen die vorgeschriebenen H2-Abschnitte. Umgeben Sie jede Überschrift mit Leerzeilen. Eingerückte, HTML- und Setext-Überschriften sind nicht zulässig. H3–H6-Unterabschnitte sind innerhalb vorgeschriebener Abschnitte ohne übersprungene Ebenen erlaubt. Jeder Abschnitt benötigt sichtbaren Inhalt; übergeordnete Abschnitte dürfen ausgefüllte Unterabschnitte enthalten. Kommentare zählen nicht als Inhalt.

Info enthält weder Implementierungscode noch Endpunktspezifikationen. Anwendung und Technik dürfen ausgeglichene Codeblöcke mit Backticks oder Tilden verwenden. Die schließende Markierung verwendet dasselbe Zeichen, ist mindestens so lang wie die öffnende und enthält keinen nachfolgenden Text. Überschriften und Kommentare in Beispielen bleiben wörtlicher Inhalt. Code und Listen ersetzen keinen Einleitungsabsatz.

Die vollständige Dateimatrix besteht aus drei Dateien für jede Sprache `en`, `de`, `id` und `ja`, also zwölf Dateien je Thema. Komponentenmanifeste deklarieren genau die englischen Pfade für README, USAGE und TECHNICAL. Kernverzeichnisse verwenden INFO, USAGE und TECHNICAL ohne eigenes Komponentenmanifest je Thema. Basenamen sind groß-, Sprachsuffixe kleingeschrieben. Zusätzliche Markdown-Handbücher außerhalb des getrennten Änderungsbereichs sind nicht zulässig.

## Konfiguration

Führen Sie `npm run check:docs` aus. PR-CI vergleicht neue Änderungsdateien zusätzlich mittels `--base` und `--branch` mit dem Quellzweig. Genau ein viersprachiger Änderungssatz ist erlaubt.

## Verhalten

### Grenze der Protokollierung

JavaScript und TypeScript der Anwendung sowie eingebettete Browserskripte und Ereignishandler veröffentlichen Diagnoseereignisse über die injizierte Log-Funktion oder den öffentlichen Browser-Diagnoseport. Nativer Konsolenzugriff ist auf die Protokollausgabeadapter und die Initialisierung des Logging-Gateways beschränkt. Andere Handler in derselben Datei erhalten keine Ausnahme. Befehls- und Buildberichte verwenden ausdrückliche Terminalausgaben. Die Prüfung nativer Konsolenzugriffe umfasst auch Werkzeugquellen; Test-Fixtures gehören nicht zum Produktionscode.

Mit `node --import tsx --test src/tooling/tests/logging/*.test.js` werden das Repository und die Erkennungsfälle geprüft. Die Prüfung umfasst installierte externe Module, berücksichtigt `COGNIS_EXTERNAL_MODULES_ROOT` und meldet Datei und Zeile. Aliase, berechnete Zugriffe und `node:console`-Importe sind ohne Bestandsschutz verboten.

Ein neues Thema öffnet Info. Info, Anwendung und Technik gehören zu einer Komponentenversion. Der Server liest alle Quelldateien vor der atomaren Veröffentlichung; fehlende Ansichten oder unvollständige Übersetzungen verhindern sie. Ansichtswechsel behalten die Version; historische Pakete bleiben nach dem Entfernen der Komponente lesbar.

Inhalte, Navigationstitel und Suche bevorzugen die aktive UI-Sprache, danach konfigurierte Ausweichsprachen und Englisch. Dies gilt einheitlich für Info, Nutzung und Technik sowie archivierte Versionen.

### Übersetzungskataloge

Jeder ausgelieferte Katalog `strings.xml` verwendet das Wurzelelement `<resources>`. Englische Einträge dürfen nicht leer sein; andere Sprachen behalten dieselben Schlüssel und deren Reihenfolge. Wörtliche Übersetzungsaufrufe und HTML-Übersetzungsattribute müssen einen englischen Eintrag auflösen. `node --import tsx --test src/ui/tests/strings-coverage.test.js src/tooling/tests/translations/*.test.js` prüft Kataloge und Quelltextverweise. Berechnete Schlüssel benötigen weiterhin Verhaltenstests der Komponente.

### Bindungsnamen

Die Syntaxbaumprüfung untersucht JavaScript und TypeScript im gesamten Verzeichnis `src`, einschließlich Gateways, Werkzeugen, Tests und Testdaten. Sie prüft Deklarationen, Importe, benannte Funktionen und Klassen, Destrukturierungen, Laufzeit- und Typsignaturparameter, Konstruktor-Parametereigenschaften, Catch-Bindungen und private Mitglieder. Exporte, weitere Deklaratoren, Zeilenumbrüche und Typannotationen umgehen die Prüfung nicht. Bekannte Kurzformen werden auch in CamelCase-Namen und Konstanten anhand von `src/tooling/reuse/ambiguous-name-words.json` zurückgewiesen. Nummerierte Platzhalter wie `event2` müssen ihre tatsächliche Rolle beschreiben. Statische Tabellenaliasnamen müssen ebenfalls aussagekräftig sein. Syntaxfehler lassen die Prüfung fehlschlagen.

Kurze Bindungen sind nur für ein ungenutztes, nicht exportiertes `_`, den Bezeichner `id` und übliche numerische `i`/`j`/`k`-Zähler mit passender arithmetischer Aktualisierung zulässig. Koordinaten und Abmessungen verwenden aussagekräftige lokale Namen wie `horizontalCoordinate`, `width` und `height`; Zeilen- und Spaltenzähler heißen etwa `rowIndex` und `columnIndex`. Etablierte Begriffe wie `ctx`, `log`, `i18n`, Protokollnamen und Produktnamen wie MariaDB behalten ihre Bedeutung. Öffentliche Datenschlüssel, generische Typparameter und reine Typimporte behalten ihre Vertragsrolle. Bestehende Schlüssel und exportierte API-Bezeichnungen werden durch ausdrückliche Aliasangaben statt Kompatibilitätswrapper erhalten. Die Prüfung erfolgt mit `node --test src/ui/tests/ambiguous-names.test.js src/tooling/tests/naming/detector.test.js` und auch in der vollständigen Testsuite.

### Prüfung und Grenzen

`npm run check:docs` prüft echte Komponentenmanifeste und Kernverzeichnisse. Dokumentationstests verändern Überschriften, Reihenfolge, Inhalte, Codeblöcke, Dateinamen und Manifestpfade für jede Rolle und Sprache. Außerdem vergleichen sie die Abschnittsmatrix aller lokalisierten Standards mit dem maschinenlesbaren Schema. CI führt die Dokumentationsprüfung und alle Tests aus. Diese Prüfungen sichern Gliederung und konkrete Verweise; sachliche Aussagen müssen weiterhin anhand der zuständigen Implementierung geprüft werden.

## Sicherheit

Dokumentation ist öffentlich: Zugangsdaten, private Kontodaten und Betriebsgeheimnisse gehören nicht hinein. Manifestverweise verbleiben im eigenen Dokumentationsbereich. Die Kernerkennung liest Verzeichnispakete statt beliebiger Markdown-Dateinamen.

## Referenz

README erklärt Zweck, Aufgaben, Zugriff und Einstieg ohne Endpunktdefinitionen oder Implementierungscode. USAGE bietet echte Abläufe oder öffentliche Beispiele, Voraussetzungen, erwartete Ergebnisse und Fehlerbehebung. TECHNICAL behandelt Schnittstellen, Konfiguration, Verhalten, Sicherheit und Referenzen.

Die exakten übersetzten H2-Namen und ihre Reihenfolge stehen in `src/tooling/reuse/documentation/structure.json`. Verwenden Sie eine H1 mit höchstens 30 Zeichen und eine Einleitung. Leere oder zusätzliche Abschnitte, offene Vorlagen, unausgeglichene Codeblöcke und übersprungene Überschriftenebenen sind Fehler. Vorlagen liegen unter `.github/documentation/`.

Beschreiben Sie unterstütztes Verhalten im passenden Abschnitt. Veröffentlichungsgeschichte und Implementierungsabläufe gehören ausschließlich in das Zweigprotokoll. Gemeinsame technische Absätze haben einen Eigentümer; andere Dokumente verweisen dorthin.

Komponentenressourcen verwenden ihr eigenes öffentliches statisches Präfix. Eine ausschließlich von einer Komponente mit eigenem Ressourcenbereich verwendete Datei darf nicht im Kern liegen. Kernressourcen und gemeinsame Dateien bleiben dort. CSS-Importe bilden einen zusammenhängenden alphabetischen Block mit einer Leerzeile vor Stilregeln.

Fülle jede Rolle mit nützlichen, am Quellcode geprüften Informationen statt Standardtext. Prüfe Methoden, Pfade, Felder, Rechte, Standardwerte, Persistenz und unvollständige Integrationen beim Eigentümer. Abläufe gehören in Nutzung, Implementierungsverträge in Technik. Prüfungen erkennen allgemeine Platzhalter und fehlende Quellen, beweisen aber nicht beliebige Prosa.

GitHub-Quelldateilinks verwenden den Standardzweig-Alias `blob/HEAD` oder `raw/HEAD`, auch in archivierten Dokumenten. Commit-Links in Änderungsprotokollen behalten ihre unveränderlichen Ziele.

Linktexte in Änderungsprotokollen verwenden kurze Commitreferenzen, etwa die ersten sieben Zeichen. Die Ziel-URL behält den vollständigen unveränderlichen SHA. Vollständige SHAs in Markdown- oder HTML-Linktexten lassen Dokumentationsprüfung und Repositorytests fehlschlagen.

Die Dokumentationsprüfung validiert Themenziele und Repository-Quellen. Die Commit-Linktextprüfung zählt Zeichen, ohne HTML zu erzeugen; ihr Ergebnis ist eine Diagnose, kein bereinigtes Markup.
