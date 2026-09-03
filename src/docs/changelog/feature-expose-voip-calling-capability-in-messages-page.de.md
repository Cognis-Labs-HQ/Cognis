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

## Commits

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
