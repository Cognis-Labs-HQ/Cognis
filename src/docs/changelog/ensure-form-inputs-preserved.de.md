# Formulareingaben bei Gitter-Neurenderings im Page Composer erhalten

## Zusammenfassung

Beim Wechsel zwischen kleiner und großer Bildschirmdarstellung wird das Gitter
des Page Composers neu gerendert, wobei bisher alle eingetippten Texte,
Auswahlen und Kontrollkästchen verloren gingen. Formularfeldwerte werden nun
direkt vor dem Leeren des Gitters gesichert und nach dem Neurendern
wiederhergestellt, damit Benutzereingaben bei einem Bildschirmgrößenwechsel
erhalten bleiben.

Die Korrektur gilt sowohl für den Haupt-Grid-Composer als auch für den
Sub-Grid-Composer. Felder werden anhand von `name`, dann `id` und schließlich
ihrer Position innerhalb der Element-Karte zugeordnet.

## Geänderte Dateien/Komponenten

- `src/ui/reuse/page-composer.js` — Hilfsfunktionen `captureFormState` /
  `restoreFormState` hinzugefügt; Aufrufe in `renderGridComposer` und
  `renderSubGrid`
- `src/ui/tests/page-composer-refresh.test.js` — neuer Strukturtest

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/9888e39
