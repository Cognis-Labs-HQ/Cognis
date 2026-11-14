# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Hinweise in der App.

## Schnittstellen

createNotificationSender nutzt den aktuellen Speicher verzögert. bootstrapNotifyAdapter registriert Pflichtsender, geschützte Postfachrouten und Glocke. Mit db:executor startet DbInternalNotificationStore; ohne ihn wird flüchtiger Speicher gemeldet.

| Methode  | Pfad                            | Beschreibung                                | Auth     |
| -------- | ------------------------------- | ------------------------------------------- | -------- |
| `GET`    | `/api/v1/notify/inbox`          | Benachrichtigungen des Nutzers abrufen      | Benutzer |
| `GET`    | `/api/v1/notify/inbox/count`    | Anzahl ungelesener Benachrichtigungen       | Benutzer |
| `PUT`    | `/api/v1/notify/inbox/read`     | Alle als gelesen markieren                  | Benutzer |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | Eine Benachrichtigung als gelesen markieren | Benutzer |
| `DELETE` | `/api/v1/notify/inbox/:id`      | Eine Benachrichtigung löschen               | Benutzer |
| `DELETE` | `/api/v1/notify/inbox`          | Alle Benachrichtigungen des Nutzers löschen | Benutzer |

Navigationsplugin, Styles, Übersetzungen und Symbole nutzen das beim Start registrierte Verzeichnis `/static/gateways/notify-internal/`. Das Glockensymbol gehört diesem Adapter unter `ui/assets/`.

## Konfiguration

Benachrichtigungsproduzenten können einen Eintrag als dauerhaft markieren und Aktionsbeschreibungen mit Kennung, barrierefreier Beschriftung, optionalem SVG-Symbol und Konsequenz bereitstellen. Der Adapter validiert und rendert diesen allgemeinen Vertrag und meldet die ausgewählte Kennung mit der Benachrichtigung zurück; er interpretiert weder die Domäne des Produzenten noch ruft er dessen Capabilities auf.

Produzenten können eine dauerhafte Benachrichtigung mit einem anderen UI-Hinweis korrelieren. Ein allgemeines `cognis:notification-resolved`-Ereignis entfernt und löscht jede Benachrichtigung mit derselben Korrelationskennung, ohne dass der Adapter den Produzenten kennen muss.

Erzeuger können eine nach Gebietsschema sortierte `metadata.localizedText`-Map mit `subject`- und `body`-Texten anhängen. Der interne Browseradapter wählt das erste unterstützte Browsergebietsschema und verwendet andernfalls den ursprünglichen Umschlagtext; die Domäne des Erzeugers wird nicht interpretiert.

## Verhalten

Beide Speicher behalten fünfzig Einträge pro Empfänger und entfernen die ältesten. Datenbankinhalte sind verschlüsselt und überstehen Neustarts mit stabilem DATA_ENCRYPTION_KEY. Ohne Datenbank gehen Einträge verloren; Produktion verweigert fehlende Schlüssel. Ein Entwicklungsschlüssel gilt nur im Prozess und entschlüsselt nach Neustart keine alten Daten. Kontolöschung leert das Postfach über den Datenbesitzer.

### Typisierte Zustellverträge

Die interne Zustellung bezieht den strukturierten Datenbankzugriff über ctx. Der Protokollierungsvertrag verwendet die unterstützten Bootstrap-Schweregrade. Verschlüsselung, Postfachberechtigungen und stets aktive Zustellung bleiben unverändert.

### Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, die gespeicherten Benachrichtigungen des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

Gemeinsames Verhalten: [Auth](/docs/gateways/auth/technical).

- Ein Badge mit der Anzahl ungelesener Benachrichtigungen anzeigen, das bei sichtbarer Seite alle 10 Sekunden und bei ausgeblendeter Seite alle 30 Sekunden aktualisiert wird.

### Posteingang und Wiederherstellung

Öffnen Sie die Glocke, um Benachrichtigungen zu lesen. „Erneut versuchen“ lädt den Posteingang neu, ohne eine Lese- oder Löschanfrage zu wiederholen. Ein fehlgeschlagenes erstes Laden bedeutet nicht, dass der Posteingang leer ist. Bei einer fehlgeschlagenen Aktualisierung bleiben die zuletzt bestätigten Einträge, Suchergebnisse und ungelesenen Zähler erhalten. Abgelehnte und unbestätigte Änderungen haben unterschiedliche Meldungen; eine unbestätigte Änderung kann bereits ausgeführt worden sein. Aktualisieren Sie vor einem weiteren Änderungsversuch. Eine bestätigte Änderung bleibt sichtbar, auch wenn die anschließende Aktualisierung fehlschlägt.

Die Navigationsleiste exportiert `mountProvider(scopedUiCtx)` für den öffentlichen Provider-Lader. Der Adapter registriert `notify:internal:readInbox` und `notify:internal:mutateInbox` mit den Stufen `request` und `reconcile`. Nur gültige Antworten und Bestätigungen des aktuellen Routenvertrags aktualisieren den Arbeitsspeicher. Die neueste gültige Leseanfrage hat Vorrang; laufende Änderungen verhindern überlappende Aktionen und verdrängen ältere Leseanfragen. Jede erfolgreiche Aktualisierung gleicht Inhalt, Reihenfolge und Lesestatus auch bei unveränderten Benachrichtigungs-IDs ab. Schreibanfragen werden nicht automatisch wiederholt.

Der gespeicherte Zustand und ausstehende UI-Ergebnisse gehören zur aktuellen Konto-, Token-, Seiten- und Provider-Lebensdauer. Abmeldung, Kontowechsel, Seitenmontage und Provider-Entfernung entziehen älteren Vorgängen ihre Gültigkeit. Entfernte Zeilen und geschlossene Bestätigungen können keine späteren Aktionen auslösen. Suchregistrierung, Ereignislistener, Zeitgeber und temporäres Panel werden mit ihrem Besitzer freigegeben. Es entsteht kein dauerhafter Posteingangs-Cache im Browser.

Das Arbeitsbereich-Tutorial öffnet weiterhin `#notification-toggle` und erklärt `.notification-panel`. Seine gemeinsame temporäre Lebensdauer schließt das Panel auch während einer ausstehenden Leseanfrage. Bei bestätigtem leerem Posteingang bleibt Löschen deaktiviert; bei Nichtverfügbarkeit erscheint „Erneut versuchen“ statt einer leeren Liste. Kontinuierliche Benachrichtigungen behalten ihr separates Popup sowie Aktionen, Korrelation und Ablaufverhalten. Kategorien und Zustellungseinstellungen werden hier nicht definiert.

Korrelationsauflösungen von Produzenten werden innerhalb der aktuellen Besitzerlebensdauer nacheinander und ohne Duplikate ausgeführt. Sie warten auf laufende Benutzeränderungen und die neueste Leseanfrage, bevor passende Benachrichtigungen entfernt werden. Eine unbestätigte Löschung wird niemals automatisch wiederholt.

## Sicherheit

Benachrichtigungsrouten prüfen den Empfänger und bearbeiten dessen Einträge. Dauerhafte Nachrichten benötigen DATA_ENCRYPTION_KEY; halte den Schlüssel stabil und geheim.

## Referenz

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
