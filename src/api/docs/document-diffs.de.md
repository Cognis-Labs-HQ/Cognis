# Dokumentunterschiede

Dokumentunterschiede ermöglichen es einem Modul, die Abweichungen zwischen zwei unveränderlichen Dokumentversionen zu erklären, bevor ein Benutzer auf die neuere Fassung reagiert.

## Anwendungsbeispiele

Rufen Sie `store.diff(fromVersion, toVersion)` über einen Speicher auf, der mit der Fähigkeit `docs:versionStore` erstellt wurde. Laufzeitmodule können das strukturierte Ergebnis über ihre eigene authentifizierte Route zurückgeben, `ui:documentDiff` über den Browser-ctx auflösen und das Ergebnis an `renderDocumentDiff(diff)` übergeben.

## Technische Spezifikation

Beide Hashes müssen im Namensraum des Speichers vorhanden sein und zum selben Dokument-Slug gehören. Das Ergebnis enthält Ausgangs- und Ziel-Hash, den gemeinsamen Slug und geordnete Zeilen mit der Klassifizierung `unchanged`, `added`, `removed` oder `changed`. Geänderte Einträge enthalten sowohl den vorherigen als auch den neuen Text.

Der Browser-Renderer maskiert dynamischen Text und stellt hinzugefügte Zeilen grün, geänderte Zeilen orange und entfernte Zeilen rot dar.
