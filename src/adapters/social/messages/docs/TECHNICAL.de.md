# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Nachrichten.

## Schnittstellen

### Endpunkte

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

## Konfiguration

Räume deklarieren Teilnehmer und Verschlüsselung/Zugriff. Vorlagen und Entwürfe gehören zum Konto; Offline braucht vorbereitete Ressourcen und gespeicherte Verläufe.

## Verhalten

### Nachrichten-Browserclient

Neue Gruppenräume schließen Schlüsselerzeugung und alle Mitgliedseinträge ab, bevor sie eine Integrationsquelle beanspruchen. Bei Initialisierungs- oder Bindungsfehlern wird der unvollständige Raum gelöscht; Bereinigungsfehler werden protokolliert und weitergegeben. Bestehende Räume und exklusive Quellenbindungen behalten ihr Verhalten.

Der Nachrichten-Browserclient ermöglicht Modulen, Raumnachrichten aufzulisten, private Räume zu öffnen und Nachrichten über den authentifizierten API-Vertrag des Social-Messages-Adapters zu senden.

### Verwendungsbeispiele

`uiCtx` importieren, `social:messagesUiClient` anfordern und im Browsercode `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)` oder `sendRoomMessage(roomId, payload)` aufrufen.

### Ressourceneigene Konversationen

`social:messages:resolveGroupChatUrl` akzeptiert `usernames` sowie optional `title`, `createdByAccountId`, `allowSingleMember`, `reuseExisting` und `roomId`. Standardmäßig wird eine Gruppe mit exakt gleichen Mitgliedern wiederverwendet. `reuseExisting: false` erzeugt eine eigene Konversation; eine bestehende `roomId` bleibt trotz Mitgliedschaftsänderungen erhalten und wird nach Löschung ersetzt. Neue Räume erhalten Schlüssel und Mitglieder, vorhandene behalten ihren Titel. Diese anbieterneutrale Option eignet sich für unabhängige Ressourcen, etwa Meetings.

### Exklusive Quellzuordnung für Integrationen

`social:messages:sourceBinding` bietet `bind` und `release` mit `{roomId, actorAccountId, sourceType, sourceId}`. Die Gruppenauflösung akzeptiert außerdem `source: {sourceType, sourceId}`. Berechtigte Raummitglieder können einen ungebundenen Raum zuordnen; eine andere Quelle erhält `source_conflict`, ohne die Zuordnung zu überschreiben. Wiederholte Zuordnungen derselben Quelle sind idempotent. Bedingte Aktualisierungen entscheiden gleichzeitige Anfragen; die Freigabe entfernt nur die passende Quelle. Gruppenauflösung und Zuordnungen verwenden registrierte ctx-Flows.

Browser-Provider beziehen `ui:scopedActions` über ihren Scoped ctx. Ein Aufruf mit `(ctx, moduleId, actions)` registriert einen ausführbaren Flow für jede benannte Aktion und liefert die veröffentlichten Funktionen zurück. Verwaltungsabfragen und Änderungen verwenden diese Funktionen; der Host entfernt die Flows und veraltete Handles werden nach dem Abbau zurückgewiesen. Administratorrechte stammen aus der aktuellen Rolle des aktivierten Kontos, nicht aus Rollenfeldern des Aufrufers.

### Soziale Offline-Änderungen

Profile- und Messages-Anbieter registrieren lebenszyklusgebundene HTTP-Aktionen über ctx. Zuvor geladene Profile, Beiträge, Raumlisten und verschlüsselte Verläufe bleiben im bestätigten Tab verfügbar. Profiltexte, Verfügbarkeit, Folgen-/Blockieren-Zustände, Bannerlayout, Beitragserstellung/-löschung, verschlüsselte Nachrichten in bestehenden Räumen, endgültige Reaktionszustände und Lesebestätigungen nutzen den kontogebundenen Offline-Puffer. Spätere Online-Änderungen warten auf gepufferte Änderungen desselben Anbieters. Konto- oder Sitzungswechsel während Vorbereitung oder Pufferwartezeit brechen die Aktion ab. Nachrichten und Beiträge verwenden stabile `operationId`-UUIDs; geänderte oder kontofremde Wiederholungen werden abgelehnt. Nachrichtenwiederholungen erzeugen keine weiteren Benachrichtigungen. Lesebestätigungen behalten die ursprüngliche Lesezeit.

Chats werden vor dem Puffern verschlüsselt: Klartext, Raumschlüssel und Zugangsdaten gelangen nie in die Warteschlange. Profiltexte und Beiträge liegen im Browserspeicher des aktuellen Kontos. Avatar-/Bannerdateien bis 350.000 Binärbytes teilen sich den bestehenden Puffer mit 1 MB, 1.000 Einträgen und sieben Tagen Aufbewahrung; größere Bilder benötigen eine Verbindung. Ein voller Puffer meldet einen übersetzten Fehler; Nachrichten- und Beitragsentwürfe werden erst nach erfolgreicher dauerhafter Abgabe geleert. Die Grenzen gelten für den gesamten Puffer.

Änderungen bleiben bis zur Serverbestätigung ausstehend. Nachrichten zeigen den Wartestatus; Profil-, Beitrags- und Medienaktionen nutzen die übliche Warteschlangenmeldung. Schließen und Neuladen lösen die native Browserbestätigung für ungespeicherte Änderungen aus, solange das aktuelle Konto gepufferte Einträge hat, auch bei deaktivierten Anbietern. Nach Bestätigung oder Kontobereinigung entfällt die Warnung. Wortlaut und erforderliche vorherige Interaktion bestimmt der Browser. Einträge überstehen weiterhin Neuladen; die Warnung verwirft sie nicht.

Zwischengespeicherte soziale Inhalte bleiben tablokal und zustimmungspflichtig. Erstbesuche, privates Offline-Neuladen, Raumerstellung, Mitgliedschafts-/Schlüsselverwaltung, Anrufe und große Uploads benötigen eine Verbindung. Tippen und Anwesenheit sind flüchtig und werden nicht nachgesendet. Beim Übertragen wird die aktuelle Serverautorisierung geprüft; Offline-Daten können entfernte Sperren nicht erkennen. Die ToS-Zustimmung bleibt vor Zugriff und Übertragung erforderlich.

### Offline-Navigation

Messages gibt Offline-Navigation nur frei, wenn für das aktuelle Konto und die aktuelle Sitzung eine Raumliste zwischengespeichert und die Seiten-Assets vorbereitet sind. Nachrichtenverläufe benötigen weiterhin gespeicherte verschlüsselte Nachrichten und einen entsperrten Schlüsselbund; unbekannte Unterhaltungen erfordern eine Verbindung. Das erneute Zeichnen der Navigation erhält die Offline-Sperren.

### Dauerhaft vorgemerkte Änderungen

Verschlüsselte Nachrichten löschen ihren Entwurf erst nach Serverbestätigung oder dauerhafter Vormerkung. Ein späterer Fehler beim Aktualisieren des Chats kennzeichnet diesen Beleg nicht als fehlgeschlagenen Versand. Ausstehende Nachrichten behalten ihre stabile Vorgangskennung für die Übertragung.

### Offline-Verfügbarkeit

Messages bereitet Raumliste, Übersetzungen, Seitenleistenvorlage und Emoji-Kataloge nach bestätigter Anmeldung vor. Mit vorbereiteten Seitenressourcen und einer zwischengespeicherten Raumliste lässt sich die Seite vor dem ersten Onlinebesuch offline öffnen. Nur Räume mit zwischengespeicherten Metadaten und Nachrichtenverläufen öffnen sich automatisch; die Auswahl eines nicht gespeicherten Verlaufs zeigt einen gezielten Informationshinweis. Raumregistrierung und Ressourcenverfügbarkeit bleiben bei wiederholten gebündelten und direkt bereitgestellten Importen erhalten.

### Unabhängige Emoji-Nutzung

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Lesbare mobile Inhalte

Öffne Unterhaltungen über die gemeinsame Schaltfläche mit doppeltem Winkel oben links. Raumüberschriften verwenden zwei sichtbare Zeilen, während der vollständige zugängliche Titel erhalten bleibt. Mehr Platz bleibt für Nachrichten; Entwürfe überstehen Drehungen.

### Kompakte Seitenleisten

Nachrichten zeigt Neuer Raum, Unterhaltungen und Vorlagen direkt untereinander und nutzt die verfügbare Breite. Leere und kurze Listen werden nicht mehr auf die gesamte Schubladenhöhe gestreckt. Lange Raum- und Vorlagenlisten verwenden die gemeinsame Scroll-Fläche von Composer.

### Überblick

Der Nachrichten-Adapter stellt private 1:1- und Gruppenchats innerhalb des
Social Gateway bereit. Chaträume, Mitgliedschaften und Nachrichtenkörper werden
in der Datenbank gespeichert. Nachrichtenkörper werden clientseitig mit einem
raumbezogenen Schlüssel verschlüsselt und zusätzlich mit
`DATA_ENCRYPTION_KEY` im Ruhezustand umhüllt.

### Bedrohungsmodell

- **Transport**: Schutz über TLS.
- **Datenbank**: Doppelte Hüllung (clientseitige Raumverschlüsselung plus
  serverseitige Ruhezustandsverschlüsselung mit `DATA_ENCRYPTION_KEY`).
- **Nicht E2E**: Bei Server-Kompromittierung kann Inhalt entschlüsselt werden.
- **Metadaten**: Mitgliedschaften, Zeitstempel und Nachrichtenlängen bleiben
  für Betreiber sichtbar.

### Benachrichtigungsintegration

Beim Senden einer Nachricht wird pro weiterem Raummitglied eine
Benachrichtigung mit Kategorie `messages` und `actionUrl` `/messages/<room-id>`
an das Notify Gateway übergeben. Stummschaltung pro Raum und
Kategorie-Präferenzen können die Zustellung unterdrücken.

### Raum-Mitgliedschaftsereignisse in der Zeitleiste

Mitgliedschaftsänderungen werden atomar zusammen mit passiven Einträgen `member_joined` und `member_left` in der `chat_messages`-Zeitleiste des Raums gespeichert. Diese Einträge verwenden den Inhaltstyp `application/vnd.cognis.room-event+json`; Aufrufer ändern die Mitgliedschaft, ohne einen zweiten Raum anzulegen oder ein Ereignis separat zu veröffentlichen. Bei der Auflösung eines Besprechungschats wird derselbe Vorgang auf alle ermittelten Teilnehmenden angewendet.

Eine Nachrichtenanfrage erstellt keinen Chatraum. Der Direktnachrichtenraum, der Schlüssel, die Mitgliedschaften und die ersten Beitrittsereignisse werden erst angelegt, wenn die empfangende Person die Anfrage genehmigt. Dadurch erscheinen keine reinen Anfrageräume in den Raumlisten.

### Kontextbezogenes Laden des Schlüsselbunds

Die Nachrichtenseite löst Raumschlüssel über den Schlüsselbundbereich `Social Messages` auf. Beim Öffnen wird Zugriff zum Laden vorhandener Chat-Geheimnisse angefordert; nach einem abgebrochenen Entsperren folgt keine zweite Abfrage zum Speichern eines zugestellten Schlüssels. Nach erfolgreicher oder nach dem Neuladen wiederhergestellter Entsperrung aktualisiert die Seite sowohl die Vorschauen der Raumliste als auch die aktive Unterhaltung, sodass verschlüsselte Platzhalter sofort ersetzt werden.

### Typisierte Speicherung und Routen

Rollen und Sichtbarkeitsdeklarationen sozialer Profile entsprechen jetzt den gespeicherten Datensätzen. Nachrichten- und Profilrouten behalten ihre Berechtigungsprüfungen bei; Rückrufe, Benachrichtigungen und Datenbankbefehle verwenden explizite Verträge. Fehlt die Auflösung der Gastsitzung, schlägt der Vorgang weiterhin vor dem Lesen des Gastprofils fehl.

### Geltungsbereich der Anmeldung

Kontoaktionen erfordern bestätigte Kontositzungen. Aktionen für freigegebene Ressourcen prüfen Gastanmeldungen ausdrücklich und kontrollieren die aktuelle Freigabe vor den Ressourcenberechtigungen. Kontonamen bestimmen niemals den Anmeldetyp. Widerrufener oder abgelaufener Zugriff wird abgelehnt.

## Sicherheit

Raumzugang, Mitgliedschaft und Nachrichtenlesen werden getrennt geprüft. Verschlüsselte Räume benötigen Clientschlüssel; das Bedrohungsmodell unterscheidet Inhalte von sichtbaren Routingdaten.

## Referenz

### Technische Spezifikation

Der Client gibt die ursprüngliche `Response` zurück, damit der Aufrufer Status und Nutzdaten verarbeitet. Er URI-kodiert Raum-IDs, hält Routenwissen im zuständigen Adapter, leitet optionale Zugriffstoken und die Unterdrückung von Zugriffsfehlern weiter, sendet Schreibvorgänge als JSON und ist nur verfügbar, solange Social-Gateway und Messages-Adapter aktiviert sind.

Die öffentliche Funktion `social:messages:deleteChatroom` akzeptiert eine Raum-ID und die Konto-ID des Handelnden. Sie entfernt den Raum und seine abhängigen Datensätze dauerhaft, wenn der Handelnde den Raum erstellt hat oder dessen einziger verbleibender Teilnehmer ist.

Der Adapter veröffentlicht außerdem `social:messages:resolveRoomMembership`. Mit einer Raum-ID und der Konto-ID der anfragenden Person autorisiert die Capability nur aktive Raummitglieder und gibt die Konto-IDs der aktiven Mitglieder zurück. Anbieter verwenden diese Grenze, statt direkt auf die Messages-Persistenz zuzugreifen.

Die Auswahl „Neuer Raum“ verwendet die Parameter `category: "user"` und `typeFilter: "user"` des gemeinsamen Such-Popups, wie auch andere reine Benutzersuchen etwa in Jitsi Meet, sodass für neue Unterhaltungen ausschließlich Benutzerergebnisse angeboten werden.

Ein eingehender Anruf erscheint als beigesteuerte Aktionsleiste unmittelbar unter dem Thread-Kopf, mit der Beschriftung links und den vom Anbieter verwalteten SVG-Aktionen zum Annehmen und Ablehnen rechts. Historische Anrufereignisse bleiben einfache Zeitleisteneinträge statt interaktiver Hinweise.

Der Adapter stellt die allgemeine Capability `social:messages:appendRoomEvent` für Komponenten bereit, die ein raumbezogenes Zeitleistenereignis aufzeichnen müssen. Die Nutzlast speichert nur neutrale Ereignismetadaten; die besitzenden Komponenten behalten ihre domänenspezifischen Ereignisnamen und Felder. Über den Browser-Flow `messages:formatRoomEvent` liefern diese Komponenten die lokalisierte Darstellung, ohne ihre Texte oder Darstellungsregeln in Messages einzufügen.

### Technische Spezifikation

| Seite / Bereich      | Anleitung            | Zugriff             |
| -------------------- | -------------------- | ------------------- |
| `^/messages(?:/\|$)` | Nachrichtenanleitung | Angemeldeter Nutzer |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

Das Routersignal begrenzt Tutorialregistrierungen und den Seiten-Composer. Beim Scrollen bleiben Tutorialaktionen erhalten; ein vorübergehend verlorenes gezeigtes Ziel wird ohne stilles Fortschreiten wiederhergestellt.

Die Anleitung erklärt das Verfassen einmal und zeigt Eingabe und Vorschau getrennt.

Die Gesprächsverwaltung entfällt aus Ablauf und Anzahl, solange kein Gesprächskopf verfügbar ist.

Der Schritt zur kompakten Unterhaltungsauswahl zeigt auf die sichtbare Composer-Schaltfläche der Seitenleiste. Auf dem Desktop entfällt diese verborgene Aktion sowohl aus dem Ablauf als auch aus der angezeigten Schrittzahl. Größe und Entwurfserhalt beschreibt [Nachrichten](/docs/adapters/social/messages).
