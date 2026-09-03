# Nachrichten-Browserclient

Der Nachrichten-Browserclient ermöglicht Modulen, Raumnachrichten aufzulisten, private Räume zu öffnen und Nachrichten über den authentifizierten API-Vertrag des Social-Messages-Adapters zu senden.

## Verwendungsbeispiele

`uiCtx` importieren, `social:messagesUiClient` anfordern und im Browsercode `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)` oder `sendRoomMessage(roomId, payload)` aufrufen.

## Technische Spezifikation

Der Client gibt die ursprüngliche `Response` zurück, damit der Aufrufer Status und Nutzdaten verarbeitet. Er URI-kodiert Raum-IDs, hält Routenwissen im zuständigen Adapter, leitet optionale Zugriffstoken und die Unterdrückung von Zugriffsfehlern weiter, sendet Schreibvorgänge als JSON und ist nur verfügbar, solange Social-Gateway und Messages-Adapter aktiviert sind.

Die öffentliche Funktion `social:messages:deleteChatroom` akzeptiert eine Raum-ID und die Konto-ID des Handelnden. Sie entfernt den Raum und seine abhängigen Datensätze dauerhaft, wenn der Handelnde den Raum erstellt hat oder dessen einziger verbleibender Teilnehmer ist.

## Browser-Vertrag für VoIP-Anbieter

Messages fragt die Browser-Capability `voip:startCall` des Anbieters für jeden Direkt- oder Gruppenchat separat ab. Der Anbieter erhält die Raumidentität, Kontoidentität und Anzeigemetadaten aller Mitglieder, die Quelle `messages` sowie die unterstützten Aktionen `component` und `navigate`. `null` blendet die Kamera für diesen Raum aus. Ein `component`-Ergebnis liefert Komponenten-UUID, Routen-ID, Meeting-Kontext und optionalen Modus, damit Cognis die temporäre Bühne verwaltet, das Komponentenfenster einbindet und die Bühne beim Schließen oder bei einem Fehler entfernt. Ein `navigate`-Ergebnis liefert eine gleichursprüngliche URL wie `/meetings/<meetingId>?start=1` für den App-Router. Anbieter entscheiden damit, ob ein Raum einen temporären Anruf erstellen darf, ein bestehendes Meeting öffnet oder weiterleitet, ohne das Messages-Layout direkt zu verändern. Komponentenaufrufe werden zunächst eingebettet zwischen dem Thread-Kopfbereich und der Nachrichtenliste geöffnet. Über die Zurück-Steuerung oben links wird dasselbe Komponentenfenster in den Bild-im-Bild-Modus verschoben, das rahmenlose Seitenlayout aufgehoben und die nun leere eingebettete Bühne eingeklappt.
