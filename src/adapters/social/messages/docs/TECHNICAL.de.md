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

Gemeinsames Verhalten: [Auth](/docs/gateways/auth/technical).

### Zeilenumbruch im Chat

Nachrichtentext wird im Standard-, Sprechblasen- und IRC-Stil an die verfügbare Gesprächsbreite angepasst. Kurze Nachrichten bleiben einzeilig, wenn sie hineinpassen. Ausdrückliche Zeilenumbrüche, Markdown-Formatierung und wörtlicher HTML-ähnlicher Text behalten ihre Darstellung; lange Zeichenfolgen ohne Leerzeichen können innerhalb der Nachricht umbrechen. Dies gilt für eingehende und ausgehende Nachrichten, ohne Avatare, Reaktionen oder Zustellinformationen zu verändern.

Der Schritt zum Nachrichtenverlauf zeigt im Standard-, Sprechblasen- und IRC-Stil denselben Gesprächsbereich. Nachrichten werden darin umgebrochen; gesetzte Zeilenumbrüche und Markdown bleiben erhalten. Ziele, Reihenfolge und Abschlusskennung des Rundgangs bleiben unverändert.

### Asynchrone Gesprächsaktualisierung

Nur das zuletzt ausgewählte Gespräch kann seine Kopfzeile, Nachrichten, Schlüssel und Aktionen aktualisieren. Beim Gesprächswechsel oder Verlassen von Messages werden ausstehende Ansichtsaktualisierungen ungültig. Entwürfe bleiben während der aktuellen Seitenlebensdauer ihrem ursprünglichen Gespräch zugeordnet.

Sie können den nächsten Entwurf beginnen, während eine Nachricht gesendet wird. Eine Bestätigung oder dauerhafte Einreihung löscht nur die gesendete Entwurfsversion; neuere Änderungen und Entwürfe anderer Gespräche bleiben erhalten. Erneutes Absenden ist während des laufenden Sendevorgangs gesperrt. Schlägt die anschließende Gesprächsaktualisierung fehl, bleibt die Nachricht gesendet oder eingereiht. Ein Hinweis rät vom erneuten Senden ab.

Ungelesen-Anzeigen ändern sich erst nach einer erfolgreichen Bestätigung des Lesestatus. Bei einem Fehler bleibt die Anzahl unverändert. Ein übersetzter Hinweis erscheint einmal für den anhaltenden Fehler; nach einer erfolgreichen Bestätigung kann ein späterer Fehler erneut gemeldet werden.

Fehlgeschlagene Hintergrundaktualisierungen zeigen einen lokalisierten Hinweis und bewahren die aktuellen Entwürfe. Wiederholte Fehler werden protokolliert; der Hinweis erscheint erst nach einer erfolgreichen Aktualisierung oder der Auswahl eines anderen Gesprächs erneut. Verspätete Fehler aus einem verlassenen Raum oder Konto können keine veralteten Sendefehler anzeigen, weitere Lesevorgänge starten oder das aktuelle Gespräch unterbrechen. Auch das Verlassen und erneute Öffnen von Nachrichten beendet ausstehende Aktualisierungen der alten Ansicht.

Reaktionsänderungen und das Laden älterer Nachrichten bleiben an das Gespräch gebunden, in dem sie begonnen wurden. Aktuelle Fehler zeigen einen übersetzten Hinweis und werden ohne Nachrichteninhalte protokolliert. Fehler aus einem verlassenen Gespräch, Konto oder einer verlassenen Seite werden ignoriert. Diese Aktionen werden nicht automatisch wiederholt. Die Vorschau-Anleitung behandelt Formatierung, Links und Zeilenumbrüche, keine Anhänge.

Der Schritt zur Nachrichteneingabe erklärt, dass Sie während des Sendens den nächsten Entwurf beginnen können. Nur die abgesendete Version wird nach Bestätigung oder dauerhafter Einreihung gelöscht; neuere Änderungen bleiben erhalten. Eingabe und Vorschau behalten ihre getrennten Ziele und die bestehende Reihenfolge.

### Stabile Textauswahl in Nachrichten

Bei der Auswahl von unverändertem Nachrichtentext bleiben DOM-Bereich, Richtung und Positionen erhalten, wenn neue Nachrichten, Reaktionen oder Lesemetadaten den Verlauf aktualisieren. Dies gilt für alle drei Nachrichtenstile und für eine Auswahl über benachbarte Nachrichten hinweg. Wird der ausgewählte Text selbst geändert oder entfernt, gelten die nativen Auswahlregeln; veralteter Text wird nicht wiederhergestellt.

Beim Laden früherer Nachrichten bleiben bereits geladene Nachrichten auch während Live-Aktualisierungen erhalten. Lokal vorgemerkte Nachrichten zählen weder zur Größe einer Serverseite noch zu deren Seitencursor. Doppelt geladene Seiten erzeugen keine doppelten Zeilen. Nach oben gescrollte Ansichten behalten ihren Anker; Ansichten nahe dem unteren Rand folgen neuen Inhalten. Ein Wechsel von Raum, Konto, Schlüssel oder Stil sowie erneutes Einhängen beginnt eine separate Ansicht.

Eine bestätigte Reaktion auf eine ältere sichtbare Nachricht aktualisiert ihren aktiven Zustand sofort, auch bei dauerhafter Offline-Vormerkung. Anschließend aktualisiert der bestehende Nachrichtenlistenvertrag die Seite dieser Nachricht für Reaktionsmetadaten, ohne unveränderte Nachrichtentexte zu ersetzen. Eine fehlgeschlagene Aktualisierung meldet den aktuellen Fehler und behält den bestätigten Zustand sowie ausgewählten Text bei, sowohl für neue als auch für ältere Nachrichten; die Änderung wird nicht automatisch wiederholt.

Die Regressionstests mit echtem DOM verwenden die exakt festgelegte jsdom-Entwicklungsabhängigkeit ausschließlich für Tests und passend zur unterstützten Node-Version. Sie prüfen den exportierten Renderer, DOM-Knoten, Range/Selection, Interaktionsdaten und die tatsächliche Offline-Projektion. Vorgegebene Geometrie prüft die Scroll-Regeln; Browserlayout, Touch-Auswahl und Zwischenablage werden damit nicht gemessen.

Projektionen vorgemerkter Nachrichten haben eine eigene Anfragereihenfolge, unabhängig von der Zusammenführung des Serververlaufs. Späte Antworten können weder neuere vorgemerkte Nachrichten entfernen noch verworfene Einträge wiederherstellen oder bestätigte Zeilen durch ihre vorgemerkte Kopie ersetzen. Auch unveränderte Abfragen aktualisieren diese Reihenfolge. Wird eine Projektion verworfen, wird ihre Signatur ungültig, damit die nächste Abfrage aktuelle Daten abgleichen kann.

Abfragen der neuesten Seite behalten auch ihre Veröffentlichungsreihenfolge bei. Eine späte Live-Antwort kann weder neuere bestätigte Nachrichten entfernen noch neuere Metadaten ersetzen. Ältere Antworten zur neuesten Seite werden verworfen; ausdrückliche Verlaufsabfragen werden weiterhin zusammengeführt. Veraltete Fehler lassen neuere angezeigte Inhalte unverändert.

Lesevorgänge und bestätigte Reaktionen verwenden die Reihenfolge der aktuellen Ansicht. Überlappende Verlaufsabfragen behalten neuere Metadaten pro Nachricht bei; eine vollständige Live-Seite verhindert, dass ältere Abfragen fehlende Zeilen wiederherstellen. Begrenzte volle Seiten beweisen kein Fehlen am ältesten mehrfach vorkommenden Zeitstempel; `before` bleibt exklusiv. Abdeckungsbereiche bestehen nur während älterer laufender Abfragen: Überlappende Bereiche mit gleicher Vorrangstellung gegenüber diesen Abfragen werden zusammengeführt und nach deren Ende entfernt. Eine angehaltene Abfrage erzeugt deshalb nicht einen Bereich pro Aktualisierung. Überholte Fehler nachfolgender Lesevorgänge bleiben stumm; aktuelle Lesefehler und fehlgeschlagene Änderungen bleiben sichtbar.

Der Header `x-cognis-read-source` des bereichsgebundenen Clients unterscheidet einen neuen Transport (`live`), die Teilnahme an einem bereits gestarteten Transport (`shared`) und einen gespeicherten oder wiederhergestellten Stand (`cached`). Geteilte oder zwischengespeicherte Serverzeilen überschreiben weder angezeigte Metadaten noch löschen sie geladene Zeilen. Sie können einen fehlenden älteren Abschnitt ergänzen, sofern kein Live-Ergebnis dessen Ende bestätigt hat. Ein leerer Cache-Abschnitt beendet nur den aktuell lesbaren Verlauf; ein späteres Live-Ergebnis kann ihn wieder öffnen. Vorgemerkte Änderungen werden weiterhin getrennt abgeglichen. Signaturen mit Quellenkennung lassen tatsächlich neue Antworten die Metadaten aktualisieren, auch wenn ihre Nutzdaten einem älteren Stand entsprechen.

Wenn sich die Zuständigkeit für Raum, Konto, Schlüssel, Stil oder Container geändert hat, liefert der Renderer ausdrücklich ein überholtes Ergebnis. Aktionen, Raumöffnung und Hintergrundaktualisierung beenden es ohne Fehlermeldung, Lesestatusänderung oder nachfolgende Tippstatusabfrage; aktuelle Lesefehler bleiben davon getrennt.

Der Verlaufsschritt erklärt die Textauswahl während Aktualisierungen und das Laden früherer Nachrichten unter Beibehaltung der Position. Bereich, Reihenfolge, Abschlusskennung und Zugriffsregeln bleiben gleich.

### Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, Raummitgliedschaften und Nachrichtenaktivität des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

### Schreibgeschützte Darstellung

Der Browser-Anbieter stellt `social:messagePresentation` Version 2 über seinen lebenszyklusgebundenen ctx bereit. `render({ style, records, currentAccountId })` führt `messages:presentConversation` mit den Stufen `validate` und `render` aus und liefert nicht interaktives Markup. Jeder Datensatz enthält die Zeichenketten `id`, `senderId`, `senderDisplayName`, `senderHandle`, `text` und den ISO-Zeitstempel `createdAt`. Nur diese Darstellungsfelder gelangen in die Momentaufnahme. Der Anbieter veröffentlicht die gemeinsamen Stylesheets und ein Abbruchsignal; Verbraucher beachten `cognis:message-presentation-changed` und verwenden widerrufene Anbieter nicht weiter. Echte Unterhaltungen und schreibgeschützte Ansichten teilen denselben Zeilen- und Textrenderer. Der schreibgeschützte Pfad lädt keine Räume oder Avatarbilder, registriert keine Suche, erstellt keine Lesebestätigungen und speichert keine Inhalte. Synthetische Ansichten liefern ihre eigenen lokalisierten Datensätze und Beschriftungen.

### Bereitschaft der Vorschau

Der Vertrag in Version 2 verlangt den booleschen Wert `available`. Er ist nur wahr, solange Messages und der aktuelle Profilbildanbieter aktiv sind. Profile besitzt `cognis:profile-avatar-renderer-changed`; Messages leitet Änderungen über `cognis:message-presentation-changed` weiter. Der Widerruf ist schon vor dem Entfernen aus der Registrierung sichtbar. Laufende Darstellungen prüfen die Abhängigkeitsgeneration, auch beim Entfernen und erneuten Bereitstellen desselben Rendererobjekts. Fehlt Profile oder wird sein Start zurückgerollt, bleibt die Vorschau verborgen. Nach der Reaktivierung erscheint der aktuell ausgewählte, ungespeicherte Stil ohne Neuladen oder Speichern der Einstellungen. Beim Beenden von Messages wird die Weiterleitung entfernt.

Passende Settings-Dateien, Messages 2.8.1 und Profile 3.0.19 müssen gemeinsam ausgeliefert werden. Settings akzeptiert Version 2 mit `available: true`; Version 1 und fehlende Bereitschaftsfelder sind keine Kompatibilitätsalternativen. Der gemeinsame Renderer echter Unterhaltungen sowie Auswahl und Aktualisierung bleiben unverändert.

### Gebundene Bestätigungen

Der Austritt gilt nur für das Gespräch und die Mitgliedschaft beim Öffnen der Bestätigung. Raumwechsel, Verlassen der Seite, Konto- oder Sitzungswechsel und verlorene Mitgliedschaft machen die Auswahl unwirksam. Wiederholtes Öffnen teilt eine ausstehende Aktion. Abbrechen, Escape, Schließen und der Hintergrund verlassen keinen Raum. Abbrechen ist neutral; Austritt und Vorlagenlöschen verwenden den destruktiven Stil.

Ein bestätigter Austritt wird einmal über den registrierten Nachrichtenclient gesendet. Nach einer eindeutigen Ablehnung ist eine neue Bestätigung möglich. Eine ungewisse Antwort wird nicht wiederholt; ein bestätigter Austritt bleibt bei fehlgeschlagener Aktualisierung bestätigt. Ohne frische erfolgreiche Liste bleiben bekannte Räume erhalten. Öffnen Sie Nachrichten erneut, um das Ergebnis abzugleichen. Verspätete Ergebnisse dürfen eine neue Ansicht weder ändern noch benachrichtigen.

Vorlageneditoren und Löschbestätigungen gehören zur ursprünglichen Seite, Raumauswahl, zum Konto, zur Sitzung und zum gespeicherten Vorlagenstand. Es ist nur ein Vorlagendialog gleichzeitig aktiv. Neuere oder zurückgesetzte Einstellungen machen alte Steuerelemente unwirksam und bleiben erhalten. Erfolgreiches Speichern geschieht einmal.

Nachrichten 2.8.2 korrigiert die Browserzuordnung. Serverrouten, Mitgliedschaftsregeln und der schreibgeschützte Darstellungsvertrag Version 2 bleiben unverändert. Profil bleibt 4.0.0. Die umfassenderen Bestätigungsprüfungen bleiben teilweise offen.

Der registrierte Nachrichtenclient akzeptiert eine optionale synchrone Prüfung `beforeDispatch()` für den direkten Transport. Sie läuft nach der Vorbereitung im Anfrageablauf und wird vor HTTP entfernt; sie wird nie gespeichert oder wiederholt. Der Austritt prüft damit unmittelbar vor dem Versand Ansicht, Konto, Sitzung, Mitglied, Handle und Anfrageanbieter erneut. Eine abgebrochene Vorbereitung bleibt ungesendet und erlaubt eine neue Bestätigung; nur ein gestarteter Transport kann ein ungewisses Ergebnis haben.

### Gebundene Bestätigungen

Der Schritt zur Raumverwaltung erklärt die Austrittsbestätigung und das sichere Abbrechen. Kopfbereich, optionale Verfügbarkeit, Reihenfolge und Abschlussidentität bleiben gleich. Vorlagen behalten ihre Seitenleistenaktionen; ihre Dialoge werden nach Änderungen der auslösenden Seite, Auswahl oder gespeicherten Liste unwirksam.

### Avatare im Gespräch

Der Verlaufsschritt erklärt profilgleiche Initialen sowie Vorschau und Navigation per Avatar in Stilen mit Avataren. Bereich, optionale Verfügbarkeit, Reihenfolge und Abschlussidentität bleiben unverändert.

### Avatare im Gespräch

Nachrichtenautoren verwenden den aktuellen Profile-Renderer für Initialen, Farbe und die kleine Avatargröße (32px). Initialen folgen dem Anzeigenamen, danach dem Handle; fehlt beides, bleibt die Kontokennung als Beschriftung erhalten. Vorhandene Avatarbilder und Profillinks bleiben in Stilen mit Avataren verfügbar. Darüberfahren öffnet die übliche Profilvorschau, Anklicken das Profil. IRC blendet Avatare weiterhin aus.

Die Vorschau des Nachrichtenstils in den Einstellungen nutzt dieselbe kleine Darstellung mit Beispieldaten, ohne Profillinks, Bilder, nachträgliches Laden oder Schreibvorgänge. Fehlende, deaktivierte oder unvollständige Profile-Anbieter machen die Vorschau unverfügbar; zurückkehrende Anbieter stellen sie wieder her. Gesprächszeilen behalten ihre Seiten- und Kontozuordnung, Textauswahl, Entwürfe und Leseergebnisse. Raumköpfe, Teilnehmerübersichten und andere Avatarflächen bleiben unverändert; die übergreifende Avatarprüfung bleibt teilweise offen.

Messages 2.8.3 / Profile 4.0.0.

### Lesebestätigungen

Wählen Sie **Gesehen von** neben einer gesendeten Nachricht, um Leser und Lesezeiten zu sehen. Das Fenster lässt sich per Tippen, Klicken oder Tastatur öffnen. Schließen oder Escape führt zum aktuellen Knopf zurück; Escape schließt zuerst eine aktive Profilvorschau. Tab folgt der normalen Seitenreihenfolge. Zeigen Sie auf einen Leseravatar oder fokussieren Sie ihn für die Profilvorschau; wählen Sie ihn zum Öffnen des Profils. Ohne Profilkennung bleibt der benannte Avatar unverlinkt. Leseravatare zeigen keine Verfügbarkeit. Kleine Kreise behalten ihre Größe in getrennten, nicht überlappenden 44px-Zielen. Lange Listen umbrechen; das Detailfenster scrollt innerhalb des Bildschirms.

Die Seite bindet `social:messageReceipts` an den Nachrichtenanbieter und ihre Lebensdauer. Das Öffnen führt `messages:openReadReceipts` durch `validate` und `present`. Neue Verlaufsdaten, Raum- oder Sitzungswechsel, Anbieterentfernung, Scrollen, Navigation oder Seitenende schließen das Fenster und verwerfen ausstehende Arbeit, ohne veraltete Bedienelemente zu fokussieren. Profile verwaltet Bilder, Fehlerbehandlung und die kanonische Farbe des Anzeigenamens. Messages 2.9.0 benötigt die Inhaltsgrößen und das passende CSS von Profile 4.1.0; beide Asset-Sätze müssen zusammen ausgeliefert werden. Ältere Renderer werden abgelehnt statt ersetzt oder skaliert. Der schreibgeschützte Vertrag `social:messagePresentation` v2 bleibt unverändert. Der Tutorialschritt Raumverlauf erklärt den Detailknopf und Profilavatare auch ohne vorhandene Lesebestätigungen.

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
