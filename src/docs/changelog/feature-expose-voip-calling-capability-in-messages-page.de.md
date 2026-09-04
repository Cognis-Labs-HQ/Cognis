# Grundlagen für Videoanrufe in Messages

**Feature-Zweig:** feature-expose-voip-calling-capability-in-messages-page

## Anbieterneutrale Anrufaktion im Chat

Direkt- und Gruppenchats zeigen nun eine barrierefreie Videokamera-Aktion, sobald ein Browser-VoIP-Anbieter verfügbar ist. Die Aktion übergibt die vollständige Raummitgliedschaft und eine Bild-im-Bild-Darstellungsanforderung über einen gestuften ctx-Flow, ohne Messages an Jitsi zu koppeln.

## Modul-VoIP-Anbieter laden vor Messages

Externe Module können nun Browser-Capabilities für ihre registrierten Navigations-Plug-ins deklarieren. Cognis nimmt diese Skripte in die Erkennung von Capability-Anbietern auf, sodass Jitsi `voip:startCall` bereitstellen kann, bevor Messages die Verfügbarkeit prüft und die Videokamera-Aktion darstellt.

## Raumbezogene VoIP-Aktionen

Messages fragt den Anbieter nun für jeden Raum nach einer Aktion. Anbieter können Anrufe ausblenden, ein vom Host verwaltetes Komponentenfenster mit Meeting-Kontext anfordern oder zu einem bestehenden Meeting weiterleiten. Temporäre Komponentenbühnen werden nach dem Schließen entfernt; fehlgeschlagene Starts werden protokolliert und als Toast angezeigt, ohne die Chathöhe zu verändern.

## Eingebettete Anrufe wechseln sauber zu Bild-im-Bild

Anrufkomponenten öffnen sich nun zwischen dem Thread-Kopfbereich und der Nachrichtenliste und entsprechen damit dem eingebetteten Komponentenfenster von Meeting-Whiteboards. Eine Zurück-Steuerung oben links verschiebt den Anruf in den Bild-im-Bild-Modus, stellt das normale Messages-Layout wieder her und hinterlässt nach dem Schließen keine veraltete Bühne.

## Button-Stile bleiben nach Meetings erhalten

Gemeinsame Stile für Aktionsfolgen liegen nun in einem eigenen wiederverwendbaren Stylesheet und bleiben für die Dashboard-Shell dauerhaft geladen. Beim Verlassen von Meetings werden nur die routenspezifischen Stile entfernt, sodass neutrale Seitenmenü- und Aktionsbuttons auf jeder Zielseite Rahmen, Farben, Hover- und Deaktivierungszustände behalten.

## Versionierte Stile laden nach SPA-Bereinigung neu

Die Bereitschaft von SPA-Stylesheets wird nun anhand des normalisierten Pfads statt der vollständigen versionierten URL gespeichert. Wenn beim Verlassen von Meetings Routen-CSS entfernt wird, kann eine spätere Seite dasselbe versionierte Page-Builder-Stylesheet erneut laden, statt ein veraltetes erfülltes Promise zu verwenden und mit unvollständigen Stilen zu erscheinen.

## Klingelnde Anrufe gehören dem Call-Adapter

Ein neuer Call-Adapter verwaltet jetzt Raumberechtigung, Einladungsstatus, ein Zeitlimit von 45 Sekunden für unbeantwortete Anrufe, Annehmen, Auflegen, Benachrichtigungen und die Übergabe an den VoIP-Anbieter. Beim Start ersetzt sofort eine Klingelansicht die Unterhaltung und aktiviert die Kamerasteuerung; Empfänger erhalten eine dauerhafte Benachrichtigung mit einer Schaltfläche zum Annehmen. Meetings beginnen erst nach der Annahme, und die separate Pfeilschaltfläche verschiebt die eingebettete Komponente in Bild-in-Bild.

## Entscheidungen bei eingehenden Anrufen bleiben sichtbar

Eingehende Anrufe bleiben jetzt mit grüner Annehmen- und roter Ablehnen-Schaltfläche im Bereich für kurzlebige Benachrichtigungen, statt in der Liste der Benachrichtigungsglocke zu erscheinen. Messages verschiebt den klingelnden Raum vorübergehend an den Anfang der Seitenleiste und stellt seine ursprüngliche Position nach Anrufende wieder her. Anrufende und Empfangende erhalten gezielte Rückmeldungen zu Abbruch, Ablehnung, Zeitüberschreitung und verweigerter Anbieterübergabe.

## Anrufverlauf und Klingeltöne

Übergänge im Anruflebenszyklus werden jetzt als Raumereignisse gespeichert und sind für alle Teilnehmenden sichtbar. Der Call-Adapter spielt während einer klingelnden Einladung unterschiedliche, wiederholte Töne für eingehende und ausgehende Anrufe. Wer die eigene Einladung abbricht, erhält nicht länger fälschlich eine Meldung über einen abgelehnten Anruf.

## Interaktive Klingelereignisse in Räumen

Die aktuelle klingelnde Einladung erscheint jetzt als Anrufkarte im Raumverlauf. Empfangende können sie über farblich passende SVG-Steuerelemente annehmen oder ablehnen, Anrufende sehen den Klingelstatus, und nach einer Statusänderung oder einem neueren Anruf wird der Eintrag automatisch zu einem einfachen Verlaufsereignis. Gespeicherte Hinweise überstehen die Navigation in der Oberfläche und Klingeltöne verwenden einen stärkeren Impuls.

## Stabile PiP-Übergabe und hervorgehobene Anrufe

Das Verschieben eines Meetings in Bild-in-Bild erfolgt jetzt nur einmal und bewahrt die vom Benutzer festgelegte Fenstergröße. Messages stellt die Unterhaltung sofort wieder her und zeichnet sie neu, blendet den Pfeil aus und deaktiviert die Kameraaktion bis zum Schließen der Komponente. Aktive Anrufkarten erhalten einen schattierten Hintergrund und animierten Rand; vergangene Ereignisse behalten keine Annehmen- oder Ablehnen-Steuerung.

## PiP-Fenster überstehen SPA-Navigation

Schwebende Komponentenfenster werden jetzt in die dauerhafte Dokumentoberfläche verschoben und können sich ausdrücklich vom Lebenszyklus ihrer aufrufenden Seite lösen. SPA-Navigation verwirft gewöhnliche Komponentenfenster, behält jedoch gehaltene PiP-Anrufe bis zum ausdrücklichen Schließen. Beim Popover-Abbau wird der Zustand der obersten Ebene vor dem Ausblenden geprüft, wodurch der NotSupportedError bei Zustandsänderungen durch beforetoggle verhindert wird.

## Anbietergesteuerter Anrufabbau

Gehaltene PiP-Anrufe verschieben jetzt ihre vom Broker verwaltete Bühne gemeinsam mit dem Komponentenfenster und bewahren so die von Jitsi Meet erwartete stabile Bühnen-ID. Beim Verlassen, Entfernen oder Beenden der Konferenz kann Jitsi die Elternbühne auflösen und `component-pages:discard` aufrufen; Cognis entfernt anschließend die temporäre Anrufbühne unabhängig von der SPA-Bereinigung.

## Raumbezogene Anrufwiederherstellung

Messages prüft jetzt vor dem Anzeigen der Kameraaktion, ob im jeweiligen Raum ein klingelnder oder aktiver Anruf besteht. Aktive Anrufe zeigen einen aktiven Kamerastatus und verbinden beim Auswählen sofort erneut, auch nach dem Aktualisieren. Klingelnde Anrufe werden fortgesetzt oder angenommen, statt eine zweite Einladung zu erstellen; der Server wiederholt die Prüfung bei der Erstellung, um gekreuzte Anrufe bei gleichzeitigen Klicks zu verhindern.

## Zuverlässige Anruferübergabe und isolierte Modulfilter

Anrufstart und Benachrichtigungsantwort bewahren nun eine einmal verwendbare Benutzeraktivierungsberechtigung über die asynchrone Signalisierung hinweg, sodass beide Teilnehmenden die Jitsi-Komponente einbinden können, sobald die Einladung aktiv wird. Modul-Seitenleistenfilter behalten außerdem ihren vorgesehenen randlosen inaktiven Zustand, wenn ein Anbieter während des Anrufs gemeinsame Schaltflächenstile lädt.

## Wiederverwendbare Anrufe und rückführbares PiP

Gruppenanrufe starten jetzt, sobald die erste eingeladene Person antwortet, lassen spätere Beitritte zu und werden nach dem Verlassen des letzten Teilnehmers freigegeben, sodass die nächste Kameraaktion wieder alle anruft. Floating-Window-Startoptionen können eine halbtransparente Schließen-Schaltfläche anfordern; Messages führt damit denselben aktiven Anruf aus PiP zur Komponentenoberfläche zurück. Das vom Anbieter deklarierte `allowNavigation` wird jetzt nur berücksichtigt, solange der Anruf als Bild-im-Bild schwebt, und beim Zurückkehren zur eingebetteten Ansicht wieder entzogen.

## Stabile PiP-Navigation und beibehaltene Stile

Cognis liest die Navigationsberechtigung des Jitsi-Anbieters jetzt aus dem Komponentenkontext und übernimmt dessen angeforderte PiP-Mindestgröße. Routenstile bleiben bei SPA-Navigationen eingebunden, während Social Call fähigkeitsspezifische Klassennamen verwendet. Dadurch behält ein aktives PiP-Meeting alle Stile, ohne Regeln der Anrufoberfläche auf andere Seiten zu übertragen.

## Schnellere deterministische Image-Installation

Die Installation und Bereinigung der Abhängigkeiten im Produktions-Image überspringt jetzt Netzwerkabfragen für npm-Audits und Finanzierung. Docker-Builds warten nach dem Entpacken aller Pakete nicht mehr auf optionale Registry-Endpunkte und überschreiben die Proxy-Konfiguration nicht mehr mit einem nicht unterstützten npm-Umgebungsschlüssel.

## Vollständige Jitsi-Capability-Ausrichtung

Messages veröffentlicht jetzt den vom aktuellen Jitsi-Meet-Manifest benötigten Resolver für Raummitgliedschaften. Die Capability prüft, dass die anfragende Person aktives Mitglied ist, und gibt nur aktive Raumkonto-IDs zurück. Damit kann Jitsi die Erstellung temporärer VoIP-Meetings autorisieren, ohne direkt auf den Messages-Speicher zuzugreifen.

## Konfiguration deaktivierter Module bleibt verfügbar

Core lädt jetzt Einstiegspunkte deaktivierter externer Module in einem eingeschränkten Kontext, der nur ausdrücklich für den deaktivierten Betrieb markierte Routen akzeptiert. Dadurch lassen sich Jitsi-Konfigurationsendpunkte vor der Aktivierung öffnen, während Funktionsrouten, UI-Beiträge, Flows und Capabilities inaktiv bleiben.

## Vollständiger Host-UI-Capability-Katalog

Core kündigt seine Browser-Capabilities zum Öffnen und Schließen von Komponentenseiten sowie für schwebende Fenster jetzt über die UI-Anbieterregistrierung an. Die Modulaktivierung prüft damit jede im aktuellen Jitsi-Meet-Manifest deklarierte Capability, ohne diese Core-eigenen Browserverträge abzulehnen; das Laden des Anbieters importiert das Router-Bundle, das sie installiert.

## Anbieterneutrale Benachrichtigungsaktionen und Messages-Flows

Interne Benachrichtigungen rendern nun vom Produzenten gelieferte Aktionsbeschriftungen und bereinigte SVGs über einen neutralen Vertrag für dauerhafte Benachrichtigungen. Messages besitzt allgemeine Raumaktions-Flows, die Calls erweitert, wodurch statisches Call-Wissen aus Messages entfernt wird. Das Klingeln verwendet einen längeren Doppelimpuls.

## Ausschließlich Benutzer bei der Raumsuche

Die Auswahl „Neuer Raum“ in Messages übergibt nun die Benutzerkategorie und den Typfilter der gemeinsamen Suche. Dies entspricht den von Jitsi Meet verwendeten Parametern und schließt andere Ergebnistypen aus.

## Reaktionsfähiger Suchstatus

Die Suche ersetzt den Hinweis zur Mindestlänge jetzt durch einen Ladestatus, sobald eine gültige Anfrage läuft. Fehlgeschlagene oder abgelaufene Anfragen zeigen einen ausdrücklichen Fehler, statt veraltete Ergebnisse oder einen nicht reagierenden Hinweis stehen zu lassen.

## Synchronisierte Hinweise für eingehende Anrufe

Eingehende Anrufe erscheinen jetzt in einer Leiste direkt über dem Messages-Thread-Kopf. Annehmen und Ablehnen lösen die korrelierte Benachrichtigung und den Hinweis im Chat gemeinsam auf; eine benutzerbezogene Klingel-Lease verhindert doppelte Klingeltöne aus mehreren Tabs oder Oberflächen.

## Sichtbare Anrufleiste und fokussiertes PiP

Der Status eingehender Anrufe aktualisiert jetzt den ausgewählten Raum, sodass dessen Aktionsleiste direkt unter dem Thread-Kopf erscheint, während die Benachrichtigung sichtbar bleiben kann. Gestartete VoIP-Komponenten werden ausdrücklich mit dem Jitsi-Meet-Kontext `voipCall` markiert, damit der Meeting-Chat nicht in der PiP-Oberfläche erscheint.

## Sicherer PiP-Abbau

Beim Schließen eines VoIP-Anrufs im PiP-Modus wird jetzt die ursprüngliche Portalhierarchie geprüft und sicher ausgewichen, wenn der Browser eine zustandserhaltende atomare Verschiebung ablehnt. Der Komponentenabbau endet ohne unbehandelten `HierarchyRequestError`.

## Angedockte Anrufbühne in voller Höhe

Angedockte Anbieteranrufe nutzen jetzt die gesamte verbleibende Höhe der Messages-Widget-Karte. Der aktive Thread reduziert sich auf Kopf- und Anrufbühnenzeile; Bühne, Komponenten-Host und Komponentenfenster füllen die verfügbare Inhaltszeile vollständig.

## Zuverlässige Klingelbereinigung und Bild-im-Bild-Rückkehr

Verspätete Klingel-Lease-Anfragen liefern nach dem Ende eines Anrufs nun erfolgreich ein Ergebnis ohne Klingeln. Beim Schließen eines Anrufs aus Bild-im-Bild nach einer SPA-Navigation stehen die folgerichtig gestalteten Aktionen „Zu Messages zurückkehren“, „Auflegen“ und „Abbrechen“ zur Auswahl. Die Rückkehr navigiert zum Anrufraum und stellt die vorhandene Anbieterkomponente ohne erneutes Einbinden wieder her.

## Stabiles Bild-im-Bild-Schließsteuerelement

Die Bild-im-Bild-Schließaktion behält den aktiven Anruf nun in ihrem Stage-Lebenszyklus und beseitigt dadurch den `ReferenceError` nach einer Navigation. Das Schließsteuerelement verwendet wieder die Standardgröße des schwebenden Fensters und trägt nun die destruktive Klasse `btn-cancel`.

## Idempotentes Verlassen und wiederholte Bild-im-Bild-Beständigkeit

Ein verspäteter Abbau durch den Anbieter meldet keinen Fehler mehr, wenn der Server den Anruf bereits beendet hat. Das Verlassen ist nun idempotent und die Bereinigung unterdrückt den bekannten Wettlauf mit einem nicht mehr verfügbaren Anruf. Nach der Rückkehr zu Messages bleibt der Anruf auch beim zweiten Wechsel in Bild-im-Bild über die nächste SPA-Navigation hinweg erhalten.

## Sicherheits-, Lebenszyklus- und Testsuite-Korrekturen

Die Anrufdarstellung fügt teilnehmergesteuerte Bezeichnungen nun über Textknoten ein, Anrufoperationen prüfen die aktuelle Messages-Mitgliedschaft erneut, archivierte Räume werden ausgeschlossen, aktive Gruppenbeitritte werden registriert, abgelehnte Klingelverlängerungen stoppen den Ton, abgebrochene ausgehende Abfragen beenden Einladungen und Anbieter-Verträge behalten die tatsächliche Raumart. Eingehende Anruftexte werden in allen unterstützten Sprachen über neutrale Benachrichtigungsmetadaten bereitgestellt. Der gemeinsame Suchabgleich wurde zur Einhaltung der 1.000-Zeilen-Grenze in ein eigenes API-Ergebnismodul aufgeteilt; veraltete Messages-, Benachrichtigungs- und Hartcodierungsprüfungen wurden ohne Löschen von Zeilen korrigiert.

## Eigenständige wiederverwendbare Anrufsymbole

SVGs für Anrufaktionen liegen jetzt in eigenen Asset-Dateien des Call-Adapters. Dasselbe Video-Asset stellt die Raumaktion in Messages bereit, während Benachrichtigungen sowie Annehmen- und Ablehnen-Aktionen im Raum die zugehörigen Assets wiederverwenden, ohne SVG-Markup im Quellcode einzubetten.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/968d9fb49a0df9e137ab7ab0606b5950ef759e26
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
- https://github.com/Cognis-Labs-HQ/Cognis/commit/69e21d58c8f04c27848c9b646672d6a436891d2c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2b179ef3cd20fab51af1eac5fa36506bf46021c6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b62797540e433c07ee81751a58e327085f01739
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0e7ff946
- https://github.com/Cognis-Labs-HQ/Cognis/commit/60ad8491
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbcc6537
- https://github.com/Cognis-Labs-HQ/Cognis/commit/263c98cc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/92f46be7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/14d4fbd5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a6d746bb
- https://github.com/Cognis-Labs-HQ/Cognis/commit/53dee857
- https://github.com/Cognis-Labs-HQ/Cognis/commit/630ac8d9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/4e75f696
- https://github.com/Cognis-Labs-HQ/Cognis/commit/59245f23
- https://github.com/Cognis-Labs-HQ/Cognis/commit/86cbe55e587061e6dd58927c20dd5c1fee530be9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7fa6ee9910ab1da664c9992dd88b5659fe0af400
- https://github.com/Cognis-Labs-HQ/Cognis/commit/930a3b084240205cd1e9ab4124e1bbfdbf6d2f52
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d4306538a8b51362f0c603c84c280eb3c00ce18d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/55fe7acc297c636ffa38791b448775f62b063159
- https://github.com/Cognis-Labs-HQ/Cognis/commit/734aa1e505f092db36fe2853ada1515ac0f0712a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b6e47c6553f8b24ae90e42631e3712617082c7a6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ff335be25d9d3858ae287ec0d84ee7c041fbc635
- https://github.com/Cognis-Labs-HQ/Cognis/commit/81b69ddc13d7ffba92acfaa9e3067907bfa0b55b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e9735b3df0ec8a939a9598eadc7d3681fa512594
- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713
- https://github.com/Cognis-Labs-HQ/Cognis/commit/da2e46c1
