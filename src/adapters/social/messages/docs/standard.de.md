# Nachrichten

## Überblick

Der Nachrichten-Adapter stellt private 1:1- und Gruppenchats innerhalb des
Social Gateway bereit. Chaträume, Mitgliedschaften und Nachrichtenkörper werden
in der Datenbank gespeichert. Nachrichtenkörper werden clientseitig mit einem
raumbezogenen Schlüssel verschlüsselt und zusätzlich mit
`DATA_ENCRYPTION_KEY` im Ruhezustand umhüllt.

## Endpunkte

Alle Endpunkte sind unter `/api/v1/social/messages` verfügbar. Authentifizierung ist
erforderlich, außer für `GET /messages/ping`.

| Methode | Pfad                                                | Beschreibung                                                                         |
| ------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GET     | `/messages/ping`                                    | Verfügbarkeitsprüfung des Adapters (`{ ready: true }`).                              |
| GET     | `/messages/users/lookup?q=…`                        | Profilsuche nach Nachrichtenempfängern.                                              |
| GET     | `/messages/rooms`                                   | Räume des aktuellen Nutzers inkl. Vorschau und Ungelesen-Zähler.                     |
| POST    | `/messages/rooms`                                   | Erstellt DM/Gruppe; DMs können als ausstehende Anfrage starten.                      |
| GET     | `/messages/requests`                                | Eingehende ausstehende Nachrichtenanfragen.                                          |
| POST    | `/messages/requests/:id/approve`                    | Genehmigt Anfrage und öffnet/erstellt den DM-Raum.                                   |
| POST    | `/messages/requests/:id/reject`                     | Lehnt Anfrage ab und entfernt den Empfänger aus dem vorbereiteten DM-Raum.           |
| GET     | `/messages/rooms/:id`                               | Raum-Metadaten und Mitglieder.                                                       |
| GET     | `/messages/rooms/:id/messages?before&limit`         | Paginierte Historie (bei eingehender ausstehender Anfrage bis zur Genehmigung leer). |
| POST    | `/messages/rooms/:id/messages`                      | Nachricht anhängen (`ciphertext`, `iv`, optional `authTag`).                         |
| POST    | `/messages/rooms/:id/messages/:messageId/reactions` | Emoji-Reaktion für eine Nachricht umschalten.                                        |
| POST    | `/messages/rooms/:id/read`                          | Raum bis jetzt als gelesen markieren.                                                |
| GET     | `/messages/rooms/:id/typing`                        | Aktive Tippende im Raum (ohne Anfragenden).                                          |
| POST    | `/messages/rooms/:id/typing`                        | Tippstatus des aktuellen Mitglieds aktualisieren.                                    |
| POST    | `/messages/rooms/:id/members`                       | Mitglied hinzufügen (nur Owner/Admin).                                               |
| DELETE  | `/messages/rooms/:id/members/:handle`               | Mitglied entfernen (selbst verlassen oder Kick durch Owner).                         |

## Berechtigung

Direktnachrichten von Nutzer **A** an **B** sind erlaubt, wenn:

1. keine Blockierung in beide Richtungen besteht,
2. beide Profile sichtbar sind,
3. beide einander folgen.

Wenn nur Punkt 3 fehlt (kein gegenseitiges Folgen), kann `POST /messages/rooms`
eine ausstehende Anfrage erzeugen (`202`). Der Absender kann den Raum sehen; der
Empfänger muss zuerst genehmigen.

Historisch genehmigte Anfragen erlauben spätere DMs ohne neue Anfrage, aber nur
solange Block- und Sichtbarkeitsregeln weiterhin erfüllt sind.

## Bedrohungsmodell

- **Transport**: Schutz über TLS.
- **Datenbank**: Doppelte Hüllung (clientseitige Raumverschlüsselung plus
  serverseitige Ruhezustandsverschlüsselung mit `DATA_ENCRYPTION_KEY`).
- **Nicht E2E**: Bei Server-Kompromittierung kann Inhalt entschlüsselt werden.
- **Metadaten**: Mitgliedschaften, Zeitstempel und Nachrichtenlängen bleiben
  für Betreiber sichtbar.

## Benachrichtigungsintegration

Beim Senden einer Nachricht wird pro weiterem Raummitglied eine
Benachrichtigung mit Kategorie `messages` und `actionUrl` `/messages/<room-id>`
an das Notify Gateway übergeben. Stummschaltung pro Raum und
Kategorie-Präferenzen können die Zustellung unterdrücken.

## Raum-Mitgliedschaftsereignisse in der Zeitleiste

Mitgliedschaftsänderungen werden atomar zusammen mit passiven Einträgen `member_joined` und `member_left` in der `chat_messages`-Zeitleiste des Raums gespeichert. Diese Einträge verwenden den Inhaltstyp `application/vnd.cognis.room-event+json`; Aufrufer ändern die Mitgliedschaft, ohne einen zweiten Raum anzulegen oder ein Ereignis separat zu veröffentlichen. Bei der Auflösung eines Besprechungschats wird derselbe Vorgang auf alle ermittelten Teilnehmenden angewendet.

Eine Nachrichtenanfrage erstellt keinen Chatraum. Der Direktnachrichtenraum, der Schlüssel, die Mitgliedschaften und die ersten Beitrittsereignisse werden erst angelegt, wenn die empfangende Person die Anfrage genehmigt. Dadurch erscheinen keine reinen Anfrageräume in den Raumlisten.
