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

## Konfiguration

### Dokumentationsleser

`COGNIS_DOCS_ARCHIVE_DIR` bestimmt das Archivverzeichnis. Andernfalls liegt es neben `COGNIS_CLI_TOKEN_PATH` oder im Benutzerverzeichnis unter `.cognis/docs-archive`. Der Prozess benötigt dort Schreibrechte.

## Verhalten

### Dokumentunterschiede

Dokumentunterschiede ermöglichen es einem Modul, die Abweichungen zwischen zwei unveränderlichen Dokumentversionen zu erklären, bevor ein Benutzer auf die neuere Fassung reagiert.

### Markdown-Vergleichsansichten

Verwenden Sie `renderMarkdownDocumentDiff(diff)` aus der Browser-Capability `ui:documentDiff`, um das vollständige Zieldokument mit dem Markdown-Renderer des Hosts darzustellen. Unveränderte Inhalte behalten ihre normale Dokumentdarstellung, während Ergänzungen, Ersetzungen und Entfernungen grüne, orangefarbene und rote Überlagerungen mit Navigation über die Übersichtsleiste erhalten. Der Renderer verarbeitet den zusammengesetzten Vergleich in einem einzigen Markdown-Durchlauf, sodass Codeblöcke, Listen, Zitate und andere Strukturen über geänderte Zeilen hinweg erhalten bleiben.

### Dokumentationsleser

Alle drei Ansichten und ihre verfügbaren Übersetzungen werden atomar in einer `bundle.json` unter der Komponentenversion gespeichert. Nur vollständige Pakete erscheinen im Index. Erneutes Lesen einer installierten Version aktualisiert das ganze Paket; andere vollständig veröffentlichte Versionen bleiben verfügbar.

Die Datenbankeingabe verwendet den öffentlichen strukturierten Vertrag `ensureTable` und `executeCommand` des DB-Gateways. Speichererstellung und unveränderliche Speichermethoden besitzen explizite TypeScript-Verträge und benötigen keinen konkreten Datenbanktreiber.

Gemeinsames Verhalten: [TFA](/docs/gateways/tfa/technical).

Unabhängige Einstellungsänderungen wenden keine TFA-Richtlinie an. Wenn die TFA-Lesecapability vorhanden ist, verwenden Systemabfragen und Schreibvorgänge ohne TFA-Feld deren aktuelle Richtlinie. Lesefehler werden gemeldet, statt die Erzwingung als deaktiviert anzuzeigen. Ohne diese optionale Capability ist die gespeicherte Einstellung lediglich eine möglicherweise veraltete Kopie. Explizite Richtlinienänderungen erfordern weiterhin die zuständige Capability.

Kontoprüfungen akzeptieren nur Sitzungsanmeldungen. Eine gemischte Ressourcenroute ruft ausdrücklich `share:getGuestClaims(request)` ab und prüft anschließend Ressourcen- und Aktionsberechtigungen. Fehlende oder ungültige Gastanmeldungen erlauben nur eine normale Kontoauthentifizierung, niemals Kontoberechtigungen mit Gastdaten. Eine Modulroute mit vollständiger Prüfung im Handler lässt äußere Kontorollen-Metadaten weg; Verwaltungsrouten behalten sie. Nur Provider- und App-Routenerkennung akzeptieren aktive Gastanmeldungen zur Darstellung, mit den bestehenden Rollenfiltern. Der nicht zwischengespeicherte Identitätsendpunkt gibt nur bestätigtes Subjekt, Rolle, Provider, Zweck und Einrichtungsstatus zurück.

`Promise<{ sub: string; role: "user"; providerId: string; purpose: "share"; setupPending: false } | null>`

## Sicherheit

Dokumentationsendpunkte liefern nur lesbare Informationen. Zugangsdaten und private Kontodaten gehören nicht in diese Quellen. Routen der getrennten Dokumentvergleichsfunktion prüfen Anmeldung und Dokumentrechte selbst.

## Referenz

### Technische Spezifikation

Beide Hashes müssen im Namensraum des Speichers vorhanden sein und zum selben Dokument-Slug gehören. Das Ergebnis enthält Ausgangs- und Ziel-Hash, den gemeinsamen Slug und geordnete Zeilen mit der Klassifizierung `unchanged`, `added`, `removed` oder `changed`. Geänderte Einträge enthalten sowohl den vorherigen als auch den neuen Text.

Der Browser-Renderer maskiert dynamischen Text und stellt hinzugefügte Zeilen grün, geänderte Zeilen orange und entfernte Zeilen rot dar.
