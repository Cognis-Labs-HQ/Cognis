# Interner Notify-Adapter

## Übersicht

Der interne Adapter leitet Benachrichtigungen direkt an die In-App-Benachrichtigungsglocke auf jeder Dashboard-Seite weiter. Er ist standardmäßig immer aktiv – jede über das Gateway gesendete Benachrichtigung erreicht den Posteingang des Empfängers, ohne dass Benachrichtigungseinstellungen konfiguriert werden müssen. Der Adapter speichert bis zu 50 Benachrichtigungen pro Benutzer im Arbeitsspeicher; Einträge gehen beim Neustart des Servers verloren.

## Zuständigkeiten

- Jede vom Benachrichtigungs-Gateway gesendete Benachrichtigung entgegennehmen und in den In-App-Posteingang des Empfängers ablegen.
- Die Benachrichtigungsglocke über ein Navbar-Plugin in die Dashboard-Oberfläche einfügen – beim Deaktivieren des Adapters verschwindet die Glocke vollständig.
- Ein Badge mit der Anzahl ungelesener Benachrichtigungen anzeigen, das alle 30 Sekunden aktualisiert wird.
- Ein Dropdown-Panel zum Lesen, Verwerfen und Markieren von Benachrichtigungen als gelesen bereitstellen.

## API-Routen

| Methode  | Pfad                            | Beschreibung                                | Auth     |
| -------- | ------------------------------- | ------------------------------------------- | -------- |
| `GET`    | `/api/v1/notify/inbox`          | Benachrichtigungen des Nutzers abrufen      | Benutzer |
| `GET`    | `/api/v1/notify/inbox/count`    | Anzahl ungelesener Benachrichtigungen       | Benutzer |
| `PUT`    | `/api/v1/notify/inbox/read`     | Alle als gelesen markieren                  | Benutzer |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | Eine Benachrichtigung als gelesen markieren | Benutzer |
| `DELETE` | `/api/v1/notify/inbox/:id`      | Eine Benachrichtigung löschen               | Benutzer |
| `DELETE` | `/api/v1/notify/inbox`          | Alle Benachrichtigungen des Nutzers löschen | Benutzer |

## Konfiguration

Der Adapter verfügt über keine Konfigurationsoptionen. Er ist aktiv, solange das Notify-Gateway ihn lädt (also immer, da Adapter automatisch erkannt werden). Das Deaktivieren des Adapters erfordert das Entfernen oder Umbenennen des Adapter-Verzeichnisses – woraufhin die Benachrichtigungsglocke aus der Oberfläche verschwindet.

Anrufbenachrichtigungen bleiben während des Klingelns in der Benachrichtigungsliste und zeigen eine ausdrückliche Aktion „Annehmen“, die den zugehörigen Messages-Raum mit dem Anruftoken öffnet.
