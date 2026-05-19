# Formularentwürfe im Page

## Zusammenfassung

- Formularwerte bleiben nun nicht nur bei responsiven Neurenderings erhalten,
  sondern auch bei vollständigen Seitenaktualisierungen durch persistente
  Entwurfsspeicherung pro Benutzer und Seite.
- Persistente Entwürfe sind sowohl im Haupt-Grid-Composer als auch in
  verschachtelten Sub-Composern aktiv.
- Sensible Feldtypen und Kennungen werden von der persistenten Speicherung
  ausgeschlossen.
- Große Formulare erhalten eine Aktion **Entwurf zurücksetzen**, damit
  gespeicherte Eingaben bei Bedarf schnell gelöscht werden können.

## Geänderte Dateien/Komponenten

- `src/ui/reuse/page-composer.js`
- `src/ui/tests/page-composer-refresh.test.js`
- `src/ui/styles/page-builder.css`
- `src/ui/languages/{en,de,id,ja}/strings.xml`
- `src/docs/page-composer.{en,de,id,ja}.md`

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/9888e39
- https://github.com/le-firehawk/Cognis/commit/b42d6d9c
- https://github.com/le-firehawk/Cognis/commit/1cabb35b
