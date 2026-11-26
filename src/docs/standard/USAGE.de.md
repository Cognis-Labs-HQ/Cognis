# Anwendung

Erstellen oder überarbeiten Sie ein Dokumentpaket und prüfen Sie dessen vorgeschriebene Gliederung vor dem Einreichen.

## Voraussetzungen

Bestimmen Sie die zuständige Komponente oder das Kernthema und prüfen Sie die unterstützten Aktionen anhand der Implementierung. Bereiten Sie alle vier Sprachen vor: `en`, `de`, `id` und `ja`.

## Beispiele

Kopieren Sie für jede Sprache die drei Rollenvorlagen aus `.github/documentation/` in das `docs/`-Verzeichnis der Komponente. Bei Kernthemen verwenden Sie das Themenverzeichnis unter `src/docs/` und benennen jede README-Vorlage in INFO um. Behalten Sie großgeschriebene Basenamen und Sprachsuffixe bei. Ersetzen Sie alle Anweisungen durch geprüfte Inhalte; bewahren Sie die Überschriften aus der [Gliederungsmatrix](/docs/standard/technical).

Deklarieren Sie im Komponentenmanifest die englischen Pfade für README, USAGE und TECHNICAL. Kernthemen werden über Verzeichnisse erkannt und benötigen kein eigenes Manifest. Führen Sie diese Befehle im Repository-Stamm aus:

```sh
npm run check:docs
node --experimental-vm-modules --import tsx --test src/tooling/tests/documentation/*.test.js
```

## Erwartete Ergebnisse

Die Dokumentationsprüfung meldet `Component documentation bundles and requested branch comparison are valid.` Die Tests prüfen alle ausgelieferten Pakete und verwerfen veränderte Gliederungen. Die Abschnittsmatrix der lokalisierten Standards muss dem Validierungsschema entsprechen.

## Fehlerbehebung

Bei `Required H2 order` stellen Sie die exakten Überschriften und deren Reihenfolge für Rolle und Sprache wieder her. Bei `Empty section` oder `Missing introductory paragraph` schreiben Sie sichtbaren komponentenspezifischen Text; Kommentare zählen nicht als Inhalt. Schließen Sie Codeblöcke mit demselben Zeichen in ausreichender Länge. Verschieben Sie Code und Endpunktspezifikationen aus Info. Korrigieren Sie bei Verweisfehlern Quelle oder Ziel, statt hilfreiche Verweise zu entfernen.
