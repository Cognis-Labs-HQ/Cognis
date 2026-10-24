# Nachrichten-Browserclient

Neue Gruppenräume schließen Schlüsselerzeugung und alle Mitgliedseinträge ab, bevor sie eine Integrationsquelle beanspruchen. Bei Initialisierungs- oder Bindungsfehlern wird der unvollständige Raum gelöscht; Bereinigungsfehler werden protokolliert und weitergegeben. Bestehende Räume und exklusive Quellenbindungen behalten ihr Verhalten.

Der Nachrichten-Browserclient ermöglicht Modulen, Raumnachrichten aufzulisten, private Räume zu öffnen und Nachrichten über den authentifizierten API-Vertrag des Social-Messages-Adapters zu senden.

## Verwendungsbeispiele

`uiCtx` importieren, `social:messagesUiClient` anfordern und im Browsercode `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)` oder `sendRoomMessage(roomId, payload)` aufrufen.

## Technische Spezifikation

Der Client gibt die ursprüngliche `Response` zurück, damit der Aufrufer Status und Nutzdaten verarbeitet. Er URI-kodiert Raum-IDs, hält Routenwissen im zuständigen Adapter, leitet optionale Zugriffstoken und die Unterdrückung von Zugriffsfehlern weiter, sendet Schreibvorgänge als JSON und ist nur verfügbar, solange Social-Gateway und Messages-Adapter aktiviert sind.

Die öffentliche Funktion `social:messages:deleteChatroom` akzeptiert eine Raum-ID und die Konto-ID des Handelnden. Sie entfernt den Raum und seine abhängigen Datensätze dauerhaft, wenn der Handelnde den Raum erstellt hat oder dessen einziger verbleibender Teilnehmer ist.

Der Adapter veröffentlicht außerdem `social:messages:resolveRoomMembership`. Mit einer Raum-ID und der Konto-ID der anfragenden Person autorisiert die Capability nur aktive Raummitglieder und gibt die Konto-IDs der aktiven Mitglieder zurück. Anbieter verwenden diese Grenze, statt direkt auf die Messages-Persistenz zuzugreifen.

Die Auswahl „Neuer Raum“ verwendet die Parameter `category: "user"` und `typeFilter: "user"` des gemeinsamen Such-Popups, wie auch andere reine Benutzersuchen etwa in Jitsi Meet, sodass für neue Unterhaltungen ausschließlich Benutzerergebnisse angeboten werden.

Ein eingehender Anruf erscheint als beigesteuerte Aktionsleiste unmittelbar unter dem Thread-Kopf, mit der Beschriftung links und den vom Anbieter verwalteten SVG-Aktionen zum Annehmen und Ablehnen rechts. Historische Anrufereignisse bleiben einfache Zeitleisteneinträge statt interaktiver Hinweise.

Der Adapter stellt die allgemeine Capability `social:messages:appendRoomEvent` für Komponenten bereit, die ein raumbezogenes Zeitleistenereignis aufzeichnen müssen. Die Nutzlast speichert nur neutrale Ereignismetadaten; die besitzenden Komponenten behalten ihre domänenspezifischen Ereignisnamen und Felder. Über den Browser-Flow `messages:formatRoomEvent` liefern diese Komponenten die lokalisierte Darstellung, ohne ihre Texte oder Darstellungsregeln in Messages einzufügen.

### Ressourceneigene Konversationen

`social:messages:resolveGroupChatUrl` akzeptiert `usernames` sowie optional `title`, `createdByAccountId`, `allowSingleMember`, `reuseExisting` und `roomId`. Standardmäßig wird eine Gruppe mit exakt gleichen Mitgliedern wiederverwendet. `reuseExisting: false` erzeugt eine eigene Konversation; eine bestehende `roomId` bleibt trotz Mitgliedschaftsänderungen erhalten und wird nach Löschung ersetzt. Neue Räume erhalten Schlüssel und Mitglieder, vorhandene behalten ihren Titel. Diese anbieterneutrale Option eignet sich für unabhängige Ressourcen, etwa Meetings.

## Exklusive Quellzuordnung für Integrationen

`social:messages:sourceBinding` bietet `bind` und `release` mit `{roomId, actorAccountId, sourceType, sourceId}`. Die Gruppenauflösung akzeptiert außerdem `source: {sourceType, sourceId}`. Berechtigte Raummitglieder können einen ungebundenen Raum zuordnen; eine andere Quelle erhält `source_conflict`, ohne die Zuordnung zu überschreiben. Wiederholte Zuordnungen derselben Quelle sind idempotent. Bedingte Aktualisierungen entscheiden gleichzeitige Anfragen; die Freigabe entfernt nur die passende Quelle. Gruppenauflösung und Zuordnungen verwenden registrierte ctx-Flows.

Browser-Provider beziehen `ui:scopedActions` über ihren Scoped ctx. Ein Aufruf mit `(ctx, moduleId, actions)` registriert einen ausführbaren Flow für jede benannte Aktion und liefert die veröffentlichten Funktionen zurück. Verwaltungsabfragen und Änderungen verwenden diese Funktionen; der Host entfernt die Flows und veraltete Handles werden nach dem Abbau zurückgewiesen. Administratorrechte stammen aus der aktuellen Rolle des aktivierten Kontos, nicht aus Rollenfeldern des Aufrufers.
