# Nachrichten-Browserclient

Der Nachrichten-Browserclient ermöglicht Modulen, Raumnachrichten aufzulisten, private Räume zu öffnen und Nachrichten über den authentifizierten API-Vertrag des Social-Messages-Adapters zu senden.

## Verwendungsbeispiele

`uiCtx` importieren, `social:messagesUiClient` anfordern und im Browsercode `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)` oder `sendRoomMessage(roomId, payload)` aufrufen.

## Technische Spezifikation

Der Client gibt die ursprüngliche `Response` zurück, damit der Aufrufer Status und Nutzdaten verarbeitet. Er URI-kodiert Raum-IDs, hält Routenwissen im zuständigen Adapter, leitet optionale Zugriffstoken und die Unterdrückung von Zugriffsfehlern weiter, sendet Schreibvorgänge als JSON und ist nur verfügbar, solange Social-Gateway und Messages-Adapter aktiviert sind.

Die öffentliche Funktion `social:messages:deleteChatroom` akzeptiert eine Raum-ID und die Konto-ID des Handelnden. Sie entfernt den Raum und seine abhängigen Datensätze dauerhaft, wenn der Handelnde den Raum erstellt hat oder dessen einziger verbleibender Teilnehmer ist.

Der Adapter veröffentlicht außerdem `social:messages:resolveRoomMembership`. Mit einer Raum-ID und der Konto-ID der anfragenden Person autorisiert die Capability nur aktive Raummitglieder und gibt die Konto-IDs der aktiven Mitglieder zurück. Anbieter verwenden diese Grenze, statt direkt auf die Messages-Persistenz zuzugreifen.

Die Auswahl „Neuer Raum“ verwendet die Parameter `category: "user"` und `typeFilter: "user"` des gemeinsamen Such-Popups, wie auch andere reine Benutzersuchen etwa in Jitsi Meet, sodass für neue Unterhaltungen ausschließlich Benutzerergebnisse angeboten werden.

Ein eingehender Anruf erscheint als beigesteuerte Aktionsleiste unmittelbar vor dem Thread-Kopf, mit der Beschriftung links und den vom Anbieter verwalteten SVG-Aktionen zum Annehmen und Ablehnen rechts. Historische Anrufereignisse bleiben einfache Zeitleisteneinträge statt interaktiver Hinweise.
