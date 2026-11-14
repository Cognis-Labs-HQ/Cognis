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

## Soziale Offline-Änderungen

Profile- und Messages-Anbieter registrieren lebenszyklusgebundene HTTP-Aktionen über ctx. Zuvor geladene Profile, Beiträge, Raumlisten und verschlüsselte Verläufe bleiben im bestätigten Tab verfügbar. Profiltexte, Verfügbarkeit, Folgen-/Blockieren-Zustände, Bannerlayout, Beitragserstellung/-löschung, verschlüsselte Nachrichten in bestehenden Räumen, endgültige Reaktionszustände und Lesebestätigungen nutzen den kontogebundenen Offline-Puffer. Spätere Online-Änderungen warten auf gepufferte Änderungen desselben Anbieters. Konto- oder Sitzungswechsel während Vorbereitung oder Pufferwartezeit brechen die Aktion ab. Nachrichten und Beiträge verwenden stabile `operationId`-UUIDs; geänderte oder kontofremde Wiederholungen werden abgelehnt. Nachrichtenwiederholungen erzeugen keine weiteren Benachrichtigungen. Lesebestätigungen behalten die ursprüngliche Lesezeit.

Chats werden vor dem Puffern verschlüsselt: Klartext, Raumschlüssel und Zugangsdaten gelangen nie in die Warteschlange. Profiltexte und Beiträge liegen im Browserspeicher des aktuellen Kontos. Avatar-/Bannerdateien bis 350.000 Binärbytes teilen sich den bestehenden Puffer mit 1 MB, 1.000 Einträgen und sieben Tagen Aufbewahrung; größere Bilder benötigen eine Verbindung. Ein voller Puffer meldet einen übersetzten Fehler; Nachrichten- und Beitragsentwürfe werden erst nach erfolgreicher dauerhafter Abgabe geleert. Die Grenzen gelten für den gesamten Puffer.

Änderungen bleiben bis zur Serverbestätigung ausstehend. Nachrichten zeigen den Wartestatus; Profil-, Beitrags- und Medienaktionen nutzen die übliche Warteschlangenmeldung. Schließen und Neuladen lösen die native Browserbestätigung für ungespeicherte Änderungen aus, solange das aktuelle Konto gepufferte Einträge hat, auch bei deaktivierten Anbietern. Nach Bestätigung oder Kontobereinigung entfällt die Warnung. Wortlaut und erforderliche vorherige Interaktion bestimmt der Browser. Einträge überstehen weiterhin Neuladen; die Warnung verwirft sie nicht.

Zwischengespeicherte soziale Inhalte bleiben tablokal und zustimmungspflichtig. Erstbesuche, privates Offline-Neuladen, Raumerstellung, Mitgliedschafts-/Schlüsselverwaltung, Anrufe und große Uploads benötigen eine Verbindung. Tippen und Anwesenheit sind flüchtig und werden nicht nachgesendet. Beim Übertragen wird die aktuelle Serverautorisierung geprüft; Offline-Daten können entfernte Sperren nicht erkennen. Die ToS-Zustimmung bleibt vor Zugriff und Übertragung erforderlich.

## Offline-Navigation

Messages gibt Offline-Navigation nur frei, wenn für das aktuelle Konto und die aktuelle Sitzung eine Raumliste zwischengespeichert und die Seiten-Assets vorbereitet sind. Nachrichtenverläufe benötigen weiterhin gespeicherte verschlüsselte Nachrichten und einen entsperrten Schlüsselbund; unbekannte Unterhaltungen erfordern eine Verbindung. Das erneute Zeichnen der Navigation erhält die Offline-Sperren.

## Dauerhaft vorgemerkte Änderungen

Verschlüsselte Nachrichten löschen ihren Entwurf erst nach Serverbestätigung oder dauerhafter Vormerkung. Ein späterer Fehler beim Aktualisieren des Chats kennzeichnet diesen Beleg nicht als fehlgeschlagenen Versand. Ausstehende Nachrichten behalten ihre stabile Vorgangskennung für die Übertragung.

## Offline-Verfügbarkeit

Messages bereitet Raumliste, Übersetzungen und Emoji-Kataloge nach bestätigter Anmeldung vor. Mit vorbereiteten Seitenressourcen und einer zwischengespeicherten Raumliste lässt sich die Seite vor dem ersten Onlinebesuch offline öffnen. Nur Räume mit zwischengespeicherten Metadaten und Nachrichtenverläufen öffnen sich automatisch; die Auswahl eines nicht gespeicherten Verlaufs zeigt einen gezielten Informationshinweis. Raumregistrierung und Ressourcenverfügbarkeit bleiben bei wiederholten gebündelten und direkt bereitgestellten Importen erhalten.

## Unabhängige Emoji-Nutzung

Die wiederverwendbare Reaktionsauswahl in Nachrichten erfasst die Emoji-Häufigkeit unabhängig von Reaktionsänderungen. Nur die Nachrichtenreaktion enthält den abschließenden Aktivzustand. Fehler bei der Nutzungserfassung werden protokolliert und verhindern weder die gewählte Reaktion noch ihre Aktualisierungsfunktion.

## Typisierte Speicherung und Routen

Rollen und Sichtbarkeitsdeklarationen sozialer Profile entsprechen jetzt den gespeicherten Datensätzen. Nachrichten- und Profilrouten behalten ihre Berechtigungsprüfungen bei; Rückrufe, Benachrichtigungen und Datenbankbefehle verwenden explizite Verträge. Fehlt die Auflösung der Gastsitzung, schlägt der Vorgang weiterhin vor dem Lesen des Gastprofils fehl.

## Geltungsbereich der Anmeldung

Kontoaktionen erfordern bestätigte Kontositzungen. Aktionen für freigegebene Ressourcen prüfen Gastanmeldungen ausdrücklich und kontrollieren die aktuelle Freigabe vor den Ressourcenberechtigungen. Kontonamen bestimmen niemals den Anmeldetyp. Widerrufener oder abgelaufener Zugriff wird abgelehnt.

## Zeilenumbruch im Chat

Nachrichtentext wird im Standard-, Sprechblasen- und IRC-Stil an die verfügbare Gesprächsbreite angepasst. Kurze Nachrichten bleiben einzeilig, wenn sie hineinpassen. Ausdrückliche Zeilenumbrüche, Markdown-Formatierung und wörtlicher HTML-ähnlicher Text behalten ihre Darstellung; lange Zeichenfolgen ohne Leerzeichen können innerhalb der Nachricht umbrechen. Dies gilt für eingehende und ausgehende Nachrichten, ohne Avatare, Reaktionen oder Zustellinformationen zu verändern.

## Asynchrone Gesprächsaktualisierung

Nur das zuletzt ausgewählte Gespräch kann seine Kopfzeile, Nachrichten, Schlüssel und Aktionen aktualisieren. Beim Gesprächswechsel oder Verlassen von Messages werden ausstehende Ansichtsaktualisierungen ungültig. Entwürfe bleiben während der aktuellen Seitenlebensdauer ihrem ursprünglichen Gespräch zugeordnet.

Sie können den nächsten Entwurf beginnen, während eine Nachricht gesendet wird. Eine Bestätigung oder dauerhafte Einreihung löscht nur die gesendete Entwurfsversion; neuere Änderungen und Entwürfe anderer Gespräche bleiben erhalten. Erneutes Absenden ist während des laufenden Sendevorgangs gesperrt. Schlägt die anschließende Gesprächsaktualisierung fehl, bleibt die Nachricht gesendet oder eingereiht. Ein Hinweis rät vom erneuten Senden ab.

Ungelesen-Anzeigen ändern sich erst nach einer erfolgreichen Bestätigung des Lesestatus. Bei einem Fehler bleibt die Anzahl unverändert. Ein übersetzter Hinweis erscheint einmal für den anhaltenden Fehler; nach einer erfolgreichen Bestätigung kann ein späterer Fehler erneut gemeldet werden.

Fehlgeschlagene Hintergrundaktualisierungen zeigen einen lokalisierten Hinweis und bewahren die aktuellen Entwürfe. Wiederholte Fehler werden protokolliert; der Hinweis erscheint erst nach einer erfolgreichen Aktualisierung oder der Auswahl eines anderen Gesprächs erneut. Verspätete Fehler aus einem verlassenen Raum oder Konto können keine veralteten Sendefehler anzeigen, weitere Lesevorgänge starten oder das aktuelle Gespräch unterbrechen. Auch das Verlassen und erneute Öffnen von Nachrichten beendet ausstehende Aktualisierungen der alten Ansicht.

Reaktionsänderungen und das Laden älterer Nachrichten bleiben an das Gespräch gebunden, in dem sie begonnen wurden. Aktuelle Fehler zeigen einen übersetzten Hinweis und werden ohne Nachrichteninhalte protokolliert. Fehler aus einem verlassenen Gespräch, Konto oder einer verlassenen Seite werden ignoriert. Diese Aktionen werden nicht automatisch wiederholt. Die Vorschau-Anleitung behandelt Formatierung, Links und Zeilenumbrüche, keine Anhänge.

## Stabile Textauswahl in Nachrichten

Bei der Auswahl von unverändertem Nachrichtentext bleiben DOM-Bereich, Richtung und Positionen erhalten, wenn neue Nachrichten, Reaktionen oder Lesemetadaten den Verlauf aktualisieren. Dies gilt für alle drei Nachrichtenstile und für eine Auswahl über benachbarte Nachrichten hinweg. Wird der ausgewählte Text selbst geändert oder entfernt, gelten die nativen Auswahlregeln; veralteter Text wird nicht wiederhergestellt.

Beim Laden früherer Nachrichten bleiben bereits geladene Nachrichten auch während Live-Aktualisierungen erhalten. Lokal vorgemerkte Nachrichten zählen weder zur Größe einer Serverseite noch zu deren Seitencursor. Doppelt geladene Seiten erzeugen keine doppelten Zeilen. Nach oben gescrollte Ansichten behalten ihren Anker; Ansichten nahe dem unteren Rand folgen neuen Inhalten. Ein Wechsel von Raum, Konto, Schlüssel oder Stil sowie erneutes Einhängen beginnt eine separate Ansicht.

Eine bestätigte Reaktion auf eine ältere sichtbare Nachricht aktualisiert ihren aktiven Zustand sofort, auch bei dauerhafter Offline-Vormerkung. Anschließend aktualisiert der bestehende Nachrichtenlistenvertrag die Seite dieser Nachricht für Reaktionsmetadaten, ohne unveränderte Nachrichtentexte zu ersetzen. Eine fehlgeschlagene Aktualisierung meldet den aktuellen Fehler und behält den bestätigten Zustand sowie ausgewählten Text bei, sowohl für neue als auch für ältere Nachrichten; die Änderung wird nicht automatisch wiederholt.

Die Regressionstests mit echtem DOM verwenden die exakt festgelegte jsdom-Entwicklungsabhängigkeit ausschließlich für Tests und passend zur unterstützten Node-Version. Sie prüfen den exportierten Renderer, DOM-Knoten, Range/Selection, Interaktionsdaten und die tatsächliche Offline-Projektion. Vorgegebene Geometrie prüft die Scroll-Regeln; Browserlayout, Touch-Auswahl und Zwischenablage werden damit nicht gemessen.

Projektionen vorgemerkter Nachrichten haben eine eigene Anfragereihenfolge, unabhängig von der Zusammenführung des Serververlaufs. Späte Antworten können weder neuere vorgemerkte Nachrichten entfernen noch verworfene Einträge wiederherstellen oder bestätigte Zeilen durch ihre vorgemerkte Kopie ersetzen. Auch unveränderte Abfragen aktualisieren diese Reihenfolge. Wird eine Projektion verworfen, wird ihre Signatur ungültig, damit die nächste Abfrage aktuelle Daten abgleichen kann.

Abfragen der neuesten Seite behalten auch ihre Veröffentlichungsreihenfolge bei. Eine späte Live-Antwort kann weder neuere bestätigte Nachrichten entfernen noch neuere Metadaten ersetzen. Ältere Antworten zur neuesten Seite werden verworfen; ausdrückliche Verlaufsabfragen werden weiterhin zusammengeführt. Veraltete Fehler lassen neuere angezeigte Inhalte unverändert.

Lesevorgänge und bestätigte Reaktionen verwenden die Reihenfolge der aktuellen Ansicht. Überlappende Verlaufsabfragen behalten neuere Metadaten pro Nachricht bei; eine vollständige Live-Seite verhindert, dass ältere Abfragen fehlende Zeilen wiederherstellen. Begrenzte volle Seiten beweisen kein Fehlen am ältesten mehrfach vorkommenden Zeitstempel; `before` bleibt exklusiv. Abdeckungsbereiche bestehen nur während älterer laufender Abfragen: Überlappende Bereiche mit gleicher Vorrangstellung gegenüber diesen Abfragen werden zusammengeführt und nach deren Ende entfernt. Eine angehaltene Abfrage erzeugt deshalb nicht einen Bereich pro Aktualisierung. Überholte Fehler nachfolgender Lesevorgänge bleiben stumm; aktuelle Lesefehler und fehlgeschlagene Änderungen bleiben sichtbar.

Der Header `x-cognis-read-source` des bereichsgebundenen Clients unterscheidet einen neuen Transport (`live`), die Teilnahme an einem bereits gestarteten Transport (`shared`) und einen gespeicherten oder wiederhergestellten Stand (`cached`). Geteilte oder zwischengespeicherte Serverzeilen überschreiben weder angezeigte Metadaten noch löschen sie geladene Zeilen. Sie können einen fehlenden älteren Abschnitt ergänzen, sofern kein Live-Ergebnis dessen Ende bestätigt hat. Ein leerer Cache-Abschnitt beendet nur den aktuell lesbaren Verlauf; ein späteres Live-Ergebnis kann ihn wieder öffnen. Vorgemerkte Änderungen werden weiterhin getrennt abgeglichen. Signaturen mit Quellenkennung lassen tatsächlich neue Antworten die Metadaten aktualisieren, auch wenn ihre Nutzdaten einem älteren Stand entsprechen.

Wenn sich die Zuständigkeit für Raum, Konto, Schlüssel, Stil oder Container geändert hat, liefert der Renderer ausdrücklich ein überholtes Ergebnis. Aktionen, Raumöffnung und Hintergrundaktualisierung beenden es ohne Fehlermeldung, Lesestatusänderung oder nachfolgende Tippstatusabfrage; aktuelle Lesefehler bleiben davon getrennt.

## Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, Raummitgliedschaften und Nachrichtenaktivität des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

Für die Bereitstellung ist der mitgelieferte Auth-Anbieter 2.2.12 oder eine Alternative erforderlich, die diesen versionierten Vertrag implementiert; veränderbare öffentliche Flow-Ergebnisse dienen nicht als Ersatz. Die Bereinigung verwendet die bestätigte Löschung, statt nach der Löschung erneut zu autorisieren. Eine bereits gestartete externe Änderung kann vor einem späteren Fehler teilweise abgeschlossen sein; ein komponentenübergreifendes Zurückrollen ist nicht garantiert. Bestehende Oberflächenbedienelemente und Tutorials bleiben unverändert.

Diese Umstellung schützt die Bereinigung durch die mitgelieferten Komponenten. Bevor die Kontolöschung in einer Bereitstellung aktiviert wird, müssen externe Bereinigungs-Hooks aktualisiert oder deaktiviert werden, die weiterhin veränderbaren öffentlichen Flow-Ergebnissen vertrauen.

## Schreibgeschützte Darstellung

Der Browser-Anbieter stellt `social:messagePresentation` Version 1 über seinen lebenszyklusgebundenen ctx bereit. `render({ style, records, currentAccountId })` führt `messages:presentConversation` mit den Stufen `validate` und `render` aus und liefert nicht interaktives Markup. Jeder Datensatz enthält die Zeichenketten `id`, `senderId`, `senderDisplayName`, `senderHandle`, `text` und den ISO-Zeitstempel `createdAt`. Nur diese Darstellungsfelder gelangen in die Momentaufnahme. Der Anbieter veröffentlicht die gemeinsamen Stylesheets und ein Abbruchsignal; Verbraucher beachten `cognis:message-presentation-changed` und verwenden widerrufene Anbieter nicht weiter. Echte Unterhaltungen und schreibgeschützte Ansichten teilen denselben Zeilen- und Textrenderer. Der schreibgeschützte Pfad lädt keine Räume oder Avatarbilder, registriert keine Suche, erstellt keine Lesebestätigungen und speichert keine Inhalte. Synthetische Ansichten liefern ihre eigenen lokalisierten Datensätze und Beschriftungen.
