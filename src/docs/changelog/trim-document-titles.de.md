# Lange Doku-Titel kürzen

## Zusammenfassung

- Lange Dokumentationstitel werden in der Docs-Navigation der UI gekürzt dargestellt.
- Gerenderte Dokument-Überschriften sind nun visuell auf 30 Zeichenbreiten begrenzt; bei langen Überschriften bleibt der vollständige Text per Hover-Metadaten erhalten.
- Die spezielle Docs-Stylesheet-Datei wird jetzt auf der Docs-Seite geladen, und die Kürzungslogik ist durch Tests abgedeckt.

## Geänderte Dateien / Komponenten

- `src/ui/app/docs/index.js`
- `src/ui/public/pages/docs.html`
- `src/ui/styles/docs.css`
- `src/ui/tests/docs-links.test.js`

## Commit-Links

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e8f614f1abf5a1453253da61913b2c38c07a897a
