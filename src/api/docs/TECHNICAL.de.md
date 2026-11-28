# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Anwendungsserver.

## Schnittstellen

### Dokumentationsleser

| Methode | Pfad                                    | Ergebnis                                            |
| ------- | --------------------------------------- | --------------------------------------------------- |
| GET     | `/api/v1/docs`                          | Listet Dokumentationspakete und ihre Versionen auf. |
| GET     | `/api/v1/docs/:version/:slug`           | Liest Info aus der gewählten Version.               |
| GET     | `/api/v1/docs/:version/:slug/usage`     | Liest Anwendung aus derselben Version.              |
| GET     | `/api/v1/docs/:version/:slug/technical` | Liest Technik aus derselben Version.                |

`langs` legt die Sprachreihenfolge fest; Englisch ist die letzte Ersatzsprache. Der Index liefert `slug`, `title`, `group`, `version`, `versions`, `sourceName` und `views`.

Die Abfrage `langs` enthält eine geordnete, kommagetrennte Sprachliste für Indextitel und Inhalte. Regionale Angaben versuchen ihre Basissprache vor der nächsten Präferenz; Englisch bleibt als verpflichtende Ausweichsprache verfügbar. Dieselbe Auflösung gilt für Info, Nutzung und Technik der angeforderten Version.

Ein Kernthema verwendet den relativen Verzeichnisnamen als Slug; das Wurzelthema heißt `index`. Komponentenschlüssel bezeichnen den Manifesteigentümer. Alle drei Ansichten lösen ihre lokalisierte Dateifamilie nach dem [Dokumentationsvertrag](/docs/standard/technical) auf.

## Konfiguration

### Dokumentationsleser

`COGNIS_DOCS_ARCHIVE_DIR` bestimmt das Archivverzeichnis. Andernfalls liegt es neben `COGNIS_CLI_TOKEN_PATH` oder im Benutzerverzeichnis unter `.cognis/docs-archive`. Der Prozess benötigt dort Schreibrechte.

## Verhalten

### Dokumentunterschiede

`docs:versionStore.createStore({ namespace, database, documents })` erzeugt einen Namensraumspeicher mit `ensureSchema`, `getLatest`, `getVersion`, `deleteAll`, `publish` und `diff`. `diff(fromHash, toHash)` verlangt zwei Versionen desselben Slugs.

Dokumentunterschiede ermöglichen es einem Modul, die Abweichungen zwischen zwei unveränderlichen Dokumentversionen zu erklären, bevor ein Benutzer auf die neuere Fassung reagiert.

### Markdown-Vergleichsansichten

Verwenden Sie `renderMarkdownDocumentDifference(diff)` aus der Browser-Capability `ui:documentDiff`, um das vollständige Zieldokument mit dem Markdown-Renderer des Hosts darzustellen. Unveränderte Inhalte behalten ihre normale Dokumentdarstellung, während Ergänzungen, Ersetzungen und Entfernungen grüne, orangefarbene und rote Überlagerungen mit Navigation über die Übersichtsleiste erhalten. Der Renderer verarbeitet den zusammengesetzten Vergleich in einem einzigen Markdown-Durchlauf, sodass Codeblöcke, Listen, Zitate und andere Strukturen über geänderte Zeilen hinweg erhalten bleiben.

### Dokumentationsleser

Alle drei Ansichten und ihre verfügbaren Übersetzungen werden atomar in einer `bundle.json` unter der Komponentenversion gespeichert. Nur vollständige Pakete erscheinen im Index. Erneutes Lesen einer installierten Version aktualisiert das ganze Paket; andere vollständig veröffentlichte Versionen bleiben verfügbar.

## Sicherheit

Dokumentationsendpunkte liefern nur lesbare Informationen. Zugangsdaten und private Kontodaten gehören nicht in diese Quellen. Routen der getrennten Dokumentvergleichsfunktion prüfen Anmeldung und Dokumentrechte selbst.

## Referenz

### Technische Spezifikation

Beide Hashes müssen im Namensraum des Speichers vorhanden sein und zum selben Dokument-Slug gehören. Das Ergebnis enthält Ausgangs- und Ziel-Hash, den gemeinsamen Slug und geordnete Zeilen mit der Klassifizierung `unchanged`, `added`, `removed` oder `changed`. Geänderte Einträge enthalten sowohl den vorherigen als auch den neuen Text.

Der Browser-Renderer maskiert dynamischen Text und stellt hinzugefügte Zeilen grün, geänderte Zeilen orange und entfernte Zeilen rot dar.
