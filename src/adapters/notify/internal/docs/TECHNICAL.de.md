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

## Sicherheit

Benachrichtigungsrouten prüfen den Empfänger und bearbeiten dessen Einträge. Dauerhafte Nachrichten benötigen DATA_ENCRYPTION_KEY; halte den Schlüssel stabil und geheim.

## Referenz

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
