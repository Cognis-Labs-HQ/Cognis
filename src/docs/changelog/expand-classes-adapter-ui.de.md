# PR-Changelog — Klassenräume

## Zusammenfassung

Das Classroom-Erlebnis wurde auf `/classroom` konsolidiert und die bisherigen
Seiten `/classes` und `/my-classes` dorthin umgeleitet.

Die Klassenauswahl wurde in den gemeinsamen Study-Footer verschoben, der
Classroom-Eintrag aus der Sprachmodul-Subnavigation entfernt und die
vereinheitlichte Classroom-Seite für Lehrer-/Schüleransicht, Chat/Meeting im
Raum, Klassensuche und popupbasierte Klassenerstellung erweitert.

Der Klassen-Adapter unterstützt nun Beitrittsmodi, Schutz vor doppelten
Klassen pro Sprache, Agenda-Termine, Classroom-Chat-Auflösung und garantiert
vorhandene Classroom-Datensätze; außerdem wurden Übersetzungen und
Regressionstests an den neuen Ablauf angepasst.

Das Klassenauswahl-Dropdown wurde aus dem Seiteninhalt entfernt und als
Page-Composer-Footer-Element in die globale Fußzeile integriert. Es zeigt
„Klasse: [Dropdown]" und wendet die Auswahl sofort an. Das „Lehrer:"-Präfix
wurde aus der Klassenliste und der Lehreranzeige entfernt.

Die Classroom-Ansicht wurde vollständig als 2D-Vogelperspektive neu gestaltet.
Der Raum ist mit einer Wandbegrenzung versehen. An der Vorderwand zeigt eine
dunkelgrüne Tafel die aktive Klassen-Agenda in einem kursiven Kreide-Schriftstil
mit Aktionsbuttons. Links von der Tafel befindet sich eine scrollbare
Schülerliste. Eine Holztür mit sichtbarem Schwenkbogen befindet sich an der
rechten Wand; Schüler können sie zum Verlassen der Klasse nutzen, Lehrer können
Schüler per Drag hierhin entfernen.

Der Boden füllt sich mit dynamischen Reihen aus Tisch-Stuhl-Einheiten, die mit
der Kapazität skalieren. Der Page-Composer unterstützt nun einen `footer`-Parameter
für Footer-Elemente.

## Toolbar-Nacharbeiten im Classroom

Die Classroom-Liste verwendet nun die Bezeichnung „Schüler“ und zeigt die Lehrkraft
oben in der Liste, damit das Classroom-Panel der gewünschten Terminologie folgt.

Die Classroom-Toolbar nutzt jetzt Text statt reiner Emoji-Steuerelemente, blendet
den Aktionsbereich für echte Schüleransichten aus und verbindet die Chat-/Meeting-
Buttons mit den vorhandenen Classroom-Fenstern, damit sie zuverlässig öffnen.

## Verbesserungen der Classroom-Oberfläche

Ein Klick auf das Avatar oder den Namen eines Schülers in der Klassenliste
navigiert jetzt direkt zu dessen `/profile/`-Seite.

Die Lehrkraftzeile in der Klassenliste wird nun oberhalb der Überschrift „Schüler"
dargestellt und nicht mehr innerhalb des Schülerrasters.

Das Meeting-Fenster im Unterrichtsraum ist jetzt auf die Tafel beschränkt und
überdeckt nicht mehr die gesamte Seite. Die Overlays sind absolut innerhalb des
Blackboard-Stapelkontexts positioniert.

Der Meeting-Ablauf im Unterrichtsraum spiegelt nun den vollständigen API-Ablauf
der Meetings-Seite wider: Auf einen Create-Aufruf folgt ein Join-Aufruf mit einer
dauerhaften Sitzungs-ID. Die Jitsi-Einbettung wird mit dem Anzeigenamen, der
E-Mail-Adresse und dem Avatar des aktuellen Nutzers initialisiert.

Ein Fehler wurde behoben, durch den eine Lehrkraft ihre Klassen nicht sehen
konnte und scheinbar in der Schüleransicht feststeckte. Ursachen waren eine
veraltete Rolle im localStorage, die beim Laden nicht neu abgerufen wurde, sowie
ein `classroomBound`-Flag am persistenten `#app`-Element, das das erneute Binden
von Interaktionshandlern nach der SPA-Navigation verhinderte.

## Classroom-Meetings öffnen sich für Schüler nun korrekt

Schüler, die einen Meeting-Button auf dem Classroom-Board anklicken, treten
jetzt dem aktiven Meeting bei, anstatt zu versuchen, ein neues zu erstellen
(was eine Lehrer-Aktion ist und für Schüler immer fehlschlug). Schüler ohne
aktives Meeting sehen keine Verhaltensänderung.

## DOM-Aktualisierung setzt den Jitsi-Meeting-iframe nicht mehr zurück

Präsenzänderungen lösten bisher eine vollständige Classroom-Inhaltserneuerung
aus, die den Meeting-iframe kurzzeitig vom Dokument trennte — ein
browserdefiniertesVerhalten, das iframes zurücksetzt. Das Frame wurde bei jeder
Statusänderung eines Teilnehmers zerstört. Präsenzänderungen verwenden nun den
gezielten `refreshDynamicDom`-Pfad, der nur den Schreibtischboden und die
Mitgliederliste ersetzt, ohne das Meeting-Overlay zu berühren.

## Vollständige DOM-Aktualisierungen erhalten aktive Meetings und Chat-Fenster

Bei DOM-Aktualisierungen, die das gesamte Classroom-Inhaltselement ersetzen
(Klasseneinstellungen, Sitzverwaltung usw.), werden Meeting- und Chat-Overlay-
Elemente jetzt zuerst in einen lebenden Vorfahren verschoben und danach wieder
in die Tafel eingefügt. Dadurch bleiben beide Elemente — und alle iframes darin
— während der gesamten Operation mit dem Dokument verbunden.

## Meeting-Lebenszyklus im Classroom — volle Jitsi-Parität

Die Meeting-Logik im Classroom wurde in die neue Factory
`createClassroomMeetingEmbed` im `jitsi-meet`-Modul ausgelagert und folgt nun
exakt dem Lebenszyklus der Meetings-Seite:

- `videoConferenceJoined` — erfasst die lokale Teilnehmer-ID, ermittelt den
  Moderatorstatus und überträgt Anzeigename, E-Mail und Avatar per Jitsi-Befehl.
- `participantRoleChanged` — aktualisiert den Moderatorstatus, damit Betreff
  und Passwort bei Rollenänderungen erneut angewendet werden.
- `passwordRequired` — übermittelt das gespeicherte Meeting-Passwort.
- `notificationTriggered` / `errorOccurred` — erkennt serverinitiierte
  Abbruchhinweise und schließt das Fenster mit dem Präsenz-Flag `terminated`.
- `videoConferenceLeft` / `readyToClose` — Aufräumen bei Teilnehmerinitiiertem
  Austritt.
- Heartbeat-Timer — sendet alle 10 s `presence active=true`.
- Statusaktualisierungs-Timer — fragt alle 5 s den Meeting-Status ab und
  schließt das Fenster, sobald der Server `endedAt` meldet.

`classroom-windows.js` delegiert nun vollständig an
`createClassroomMeetingEmbed` und enthält keine eigene Meeting-Logik.

## Klassenraum-Notizblock und Whiteboard

Ein klassengebundener **Notizblock** wurde hinzugefügt — ein sitzungsbezogenes
Notizfeld für alle Klassenmitglieder. Notizen werden im `sessionStorage`
gespeichert und nicht an den Server übertragen. Ein „Als Markdown herunterladen"-
Button exportiert den Inhalt als `.md`-Datei.

Eine **Whiteboard**-Funktion wurde integriert, die durch den Nextcloud-Whiteboard-
Server (`NEXTCLOUD_WHITEBOARD_URL` / `NEXTCLOUD_WHITEBOARD_SECRET`) unterstützt
wird. Lehrkräfte können benannte Whiteboards pro Klasse anlegen und löschen;
alle Klassenmitglieder können ein Whiteboard in einer Vollbildansicht öffnen.

## Geänderte Komponenten und Dateien

- Study-Classes-Adapter-Routen und -Stores:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`
- Classroom-UI und gemeinsame Study-Navigation:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/classroom-page.css`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
    - `src/ui/reuse/page-composer/init.js`
- Unterstützende Integrationen, Strings und Tests:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`
