# Klassenraum-Überarbeitung

## Tafel neu gestaltet

Die Klassentafel verwendet jetzt eine dunkle Kohlestruktur statt eines einfarbigen grünen Hintergrunds, mit weichen abgerundeten Rändern, die sich natürlich in die Seite einfügen.

## Doppelte Mitgliederliste entfernt

Die Mitgliederliste in der Seitenleiste wird nicht mehr in der Hauptansicht dupliziert. Die Tafel zeigt jetzt nur noch kompakte Listen mit anwesenden und abwesenden Benutzernamen.

## Besprechungsfenster: Schließen-Schaltfläche entfernt

Die Schließen-Schaltfläche wurde aus dem Jitsi-Besprechungsfenster entfernt. Wenn ein Schüler die Besprechung verlässt, wird er automatisch zur zuletzt besuchten Seite zurückgeleitet.

## Jitsi-Authentifizierungsblockierung

Wenn eine Besprechung eine Authentifizierung erfordert, die Schüler nicht durchführen können, stoppt das Besprechungs-Widget die erneuten Verbindungsversuche und zeigt eine Meldung an, dass der Klassenraum derzeit geschlossen ist. Die Abfrage wird automatisch fortgesetzt, sobald der Lehrer die Besprechung betritt.

## Chat als Standard-Arbeitsbereich

Schüler sehen jetzt standardmäßig das Chat-Fenster. Die Besprechungs- oder Whiteboardansicht öffnet sich automatisch, wenn der Lehrer eine aktiviert, und kehrt dann wieder zum Chat zurück.

## Abfrage des Lehrerstatus

Schüler fragen den aktiven Board-Fokus des Lehrers ab und folgen ihm automatisch, anstatt einen übertragenen Status zu empfangen.

## Notizblock neu gestaltet

Der Notizblock-Editor nimmt jetzt den gesamten Anzeigebereich ein und verfügt über eine Formatleiste mit Absatzstil, Schriftgröße und Textfarbe. Dateien können in Klassenunterlagen gespeichert, aus Klassenunterlagen geöffnet oder direkt heruntergeladen werden.

## Datei-Upload für Unterlagen

Lehrer können jetzt Dateien über das Datei-Gateway in die Klassenunterlagen hochladen. Hochgeladene Dateien werden aufgelistet und können einzeln entfernt werden.

## Steuerung für Chat/Besprechung bei Schülern entfernt

Schüler haben keine manuellen Schaltflächen mehr, um Chat- oder Besprechungsfenster ein- oder auszublenden. Die Sichtbarkeit des Arbeitsbereichs wird vollständig durch den Lehrerstatus gesteuert.

## Endlosschleife beim Betreten der Besprechung behoben

Schüler geraten nicht mehr in eine Endlosschleife beim Betreten einer Besprechung. Der automatische Beitritt wird durch einen pro-Sitzungs-Eintrag gesichert und erfolgt nur, wenn der Lehrer tatsächlich eine Besprechung gestartet hat.

## Suchschaltfläche für Schüler und Lehrer korrigiert

Die Suchschaltfläche navigiert Schüler jetzt zur Kurssuche. Lehrer in der Lehreransicht sehen die Schaltfläche nicht mehr. Der Fehler, bei dem die Kursliste nach dem Klicken verschwand, wurde behoben.

## Umschalten zwischen Lehrer- und Schüleransicht korrigiert

Das Umschalten zwischen Lehrer- und Schüleransicht erfordert keine zwei Klicks mehr und lässt die Kursliste nicht mehr verschwinden.

## Tagesordnung und Neue Tagesordnung zu Echtzeit-Bearbeitung zusammengeführt

Lehrer können Tagesordnungspunkte direkt im Panel hinzufügen, ohne ein Popup zu öffnen. Neue Punkte erscheinen für Schüler beim nächsten Aktualisieren. Jeder Punkt hat für Lehrer eine Löschen-Schaltfläche.

## Whiteboard wird beim ersten Klick automatisch erstellt

Beim Klicken auf die Whiteboard-Schaltfläche erstellt und öffnet ein Lehrer jetzt automatisch ein Whiteboard. Der zweistufige Prozess entfällt.

## Klassenraumlayout: 15 % Anwesenheitsliste + 85 % Arbeitsbereich

Die seitliche Live-Leiste wurde durch ein CSS-Grid ersetzt: links ein 15 %-breites Panel mit der Anwesenheitsliste in Kreideoptik, rechts der Hauptarbeitsbereich. Die Symbolleiste ist für alle sichtbar, aber nur für Lehrer bedienbar.

## Tafel-Stil auf das page-content-Element angewendet

Der dunkle Hintergrund der Tafel wird jetzt beim Laden direkt auf den page-content-Container angewendet.

## Dateiverwaltung für den Klassenraum-Notizblock

Über die Schaltflächen Speichern und Öffnen im Notizblock-Arbeitsbereich kann eine Dateiverwaltungsoberfläche geöffnet werden. Dateien werden pro Klasse gespeichert und können umbenannt oder gelöscht werden.

## Dauerschleife beim automatischen Beitreten behoben

Schüler gerieten in eine kontinuierliche Schleife aus Verlassen und erneutem
Beitreten, wenn die Echtzeit-Aktualisierung des Klassenraums eine laufende
Konferenz erkannte. Der Beitrittsschutz pro Konferenz wird jetzt vor dem Warten
auf den Auto-Join-Aufruf gesetzt, sodass ein schnelles `videoConferenceLeft`-Ereignis
von Jitsi die Schleife nicht mehr auslöst. Kurzzeitige Null-Werte der
Aktivkonferenz-API setzen den Schutz nicht mehr zurück.

## CSS-Architekturkonformität wiederhergestellt

`classes.css` überschritt die 1000-Zeilen-Grenze. Die Datei dient jetzt als
`@import`-Aggregator; die Stile sind auf vier spezialisierte Geschwisterdateien
unter `src/adapters/study/classes/ui/classes/` aufgeteilt: `list.css`,
`room.css`, `blackboard.css` und `editor.css`.

## Unit-Test für Klassenraum-Notizblock behoben

Der Test `classroom-notepad.test.js` schlug fehl, weil Node browser-absolute
`/static/`-Importpfade nicht auflösen konnte. Ein benutzerdefinierter ESM-Loader-Hook
(`src/tooling/test-helpers/browser-paths-hook.mjs`) bildet diese Pfade auf
echte Dateisystemspeicherorte ab.

## Exportfehler in classroom-render behoben

`classroom-render.js` exportierte einen Namen (`renderStudentRoster`), der im Modul nicht definiert war. Dies verursachte einen unkontrollierten `SyntaxError`, der die Klassenraumseite zum Absturz brachte. Der undefinierte Export wurde entfernt.

## Z-Index des Absturz-Popups über Ladeoverlay angehoben

Das Absturz-Popup für Laufzeitfehler wurde unterhalb des Seitenladeoverlay (z-index 9999) dargestellt und war daher unsichtbar, solange eine Seite noch geladen wurde. Eine neue Modifier-Klasse `popup-overlay--critical` hebt das Absturz-Popup auf z-index 10000 an und stellt sicher, dass es bei einem Fehler immer sichtbar ist.

## Schüler-Meeting im Classroom verlässt die Endlosschleife

Die automatische Join-Logik für Schüler im Classroom rief das Jitsi-Embed nach dem Verlassen eines Meetings bei jedem 3-Sekunden-Refresh-Zyklus erneut auf. Zwei Gleichzeitigkeits- und Wiedereintritts-Probleme wurden behoben: (1) Die `openMeetingEmbed`-Initialisierungsphase hält nun ein `openInProgress`-Flag, damit ein erneuter `tryAutoJoin`-Aufruf während der Jitsi-Initialisierung kein zweites Embed erstellen kann, und (2) ein `triedMeetingId`-Guard innerhalb von `classroom-meeting-embed.js` verhindert das erneute Beitreten derselben Meeting-ID. Eine neue Methode `notifyActiveMeeting(meetingId)` ermöglicht es dem Classroom-Adapter, ein wirklich neues Meeting zu signalisieren, was den Guard zurücksetzt und den Auth-Block-Status löscht. Die Refresh-Schleife des Classrooms wurde vereinfacht; die gesamte Join-Guard-Logik lebt nun im jitsi-meet-Modul.

## Classroom-Jitsi bleibt in Cognis

Beim Verlassen eines eingebetteten Classroom-Jitsi-Meetings wird das
Meetingfenster jetzt sofort in Cognis geschlossen, statt den iframe auf die
Jitsi-Startseite fallen zu lassen. Danach kehrt der Klassenraum wieder zur
Agenda-Ansicht zurück.

## Kein erneuter Beitritt zum selben Meeting nach Verlassen

Wenn ein Schüler ein aktives Classroom-Meeting bewusst verlässt, merkt sich
Cognis diese Ablehnung für die aktuelle Meeting-ID. Die Classroom-Refresh-
Schleife tritt demselben Meeting erst wieder bei, wenn ein neueres Meeting
aktiv wird.

## Classroom nutzt das Meetings-Overlay-Muster

Das Classroom-Meetingfenster zeigt jetzt dasselbe Overlay-Muster für Join- und
Closed-Zustände wie die Meetings-Seite, sodass Lade- und Schließzustände in der
Cognis-Oberfläche bleiben.

## Agenda-Route von Datei-Routen getrennt

Der Klassenzimmer-Handler zum Löschen von Agenda-Einträgen wurde in ein
eigenes Routenmodul verschoben, um Datei- und Kalenderzugriff klar zu trennen.

## normalizeBoardFocus in ein eigenes Modul ausgelagert

Der gemeinsame Board-Focus-Normalisierer befindet sich nun in einer eigenen
Datei pro Schicht (`store/board-focus.ts` auf dem Server, `ui/board-focus.js`
im Browser) anstatt in den größeren Klassenzimmer-Dateien inline definiert.

## Jitsi-Austritt bleibt in Cognis

Beim Verlassen eines eingebetteten Jitsi-Meetings auf der Meetings-Seite wird
das Meetingfenster jetzt sofort innerhalb von Cognis geschlossen. Das
Meetings-Embed fängt die Jitsi-Hangup-Aktion in der Toolbar ab, bevor der
iframe auf die gehostete Jitsi-Startseite fallen kann, und behält dabei den
bestehenden Leave-Overlay-Ablauf bei.

## Meeting-Overlay verursacht kein Seitenflackern mehr für Schüler

Beim Echtzeit-Aktualisierungszyklus wird keine vollständige DOM-Ersetzung mehr
ausgeführt, wenn ein Meeting bereits geöffnet ist. Dynamische Elemente
(Schreibtischboden, Mitgliederliste) werden direkt aktualisiert, ohne das
Meeting-Overlay zu stören.

## Schüler werden zum Klassenzimmer zurückgeführt, wenn der Lehrer das Meeting beendet

Wenn der Lehrer ein aktives Meeting verlässt, werden Schüler jetzt automatisch
aus der Meeting-Ansicht entfernt und erhalten eine Toast-Benachrichtigung.
Das Overlay schließt sich sauber und die Seite kehrt zum Standard-Arbeitsbereich zurück.

## Klassenwechsel schließt jetzt ein offenes Meeting der vorherigen Klasse

Das Auswählen einer anderen Klasse in der Fußleiste hinterlässt nicht mehr ein
veraltetes Meeting-Overlay der vorherigen Klasse. Das Meeting schließt sich,
bevor die neue Klasse geladen wird.

## CSP connect-src enthält jetzt die konfigurierte Jitsi-Instanz

Die `connect-src`-Direktive der Content Security Policy enthält jetzt den
registrierten Jitsi-Server-Ursprung neben `script-src`, wodurch
Konsolenverletzungen behoben werden, wenn die Jitsi External API Verbindungen
zum Meeting-Server herstellt.

## Jitsi-Cookie-Regression behoben

`allow-same-origin` wurde dem Jitsi-Iframe-Sandbox hinzugefügt, damit die Jitsi-Domain ihre eigenen Sitzungscookies lesen und schreiben kann.

## Meeting-Guard verhindert Jitsi-Homepage-Durchscheinen

Wenn die Authentifizierung blockiert wird oder der Benutzer den Meeting-Authentifizierungsfluss abbricht, wird das Meeting-Fenster jetzt ordnungsgemäß geschlossen, anstatt die Jitsi-Homepage durch ein Overlay anzuzeigen.

## Lehreransicht wird bei Navigation immer zurückgesetzt

Lehrer, die zuvor zur Schüleransicht gewechselt hatten, werden jetzt bei jedem Seiten-Refresh oder SPA-Navigation immer zur Lehreransicht zurückgekehrt.

## Sub-Navigation für Lehrer in Schüleransicht sichtbar

Ein Fehler wurde behoben, bei dem Lehrer in der Schüleransicht eine leere Klassenliste in der Sub-Navigationsleiste sahen.

## Classroom-Layout umstrukturiert

Der Anwesenheits-Tab wurde von der Seitenleiste in die Arbeitsbereich-Tab-Reihe verschoben. Der Klassenagenda-Eintrag wurde aus der Seitenleiste entfernt, da er bereits in den Arbeitsbereich-Tabs vorhanden ist. Die Meeting-Schaltfläche wurde aus der Tafelaktionen-Toolbar entfernt. Die Seitenleiste zeigt jetzt nur noch Klassmaterialien.

## Tafel startet eingeklappt

Beim Betreten einer Klasse ist die Tafel auf die Kopfzeile minimiert. Sie erweitert sich, wenn ein Arbeitsbereich-Tab gedrückt wird.

## Arbeitsbereich-Tab-Aktivstatus

Jede Arbeitsbereich-Tab-Schaltfläche erhält eine `active`-CSS-Klasse, wenn ihr Modus ausgewählt ist.

## Dynamisches Aktualisieren auf chirurgische Aktualisierungen beschränkt

Der Echtzeit-Aktualisierungszyklus für Schüler löst keine vollständigen DOM-Ersetzungen mehr aus; Schreibtischboden und Anwesenheitsbereich werden stattdessen an Ort und Stelle aktualisiert.

## Lehrertisch-Klick deaktiviert

Das Klicken auf den Lehrertisch öffnet nicht mehr das Benutzersuche-Popup.

## Kreide-Schriftart auf Arbeitsbereich- und Anwesenheitsbereiche beschränkt

Die Kreide-Schriftart wird jetzt explizit auf `classes-workspace-main` und `classes-roster-panel` angewendet und wird über `font-family: inherit` an Formularelemente weitergegeben.

## Tafelhöhe passt sich dem Inhalt an

Die Tafel hat keine erzwungene Mindesthöhe mehr, wenn kein Meeting aktiv ist, sodass sie sich natürlich an ihre Kinder anpasst.

## Tab „Anwesend" in „Schüler" umbenannt

Der Kursplan-Tab wurde von „Anwesend" in „Schüler" umbenannt.

## Schüler und Agenda in die Seitenleiste verschoben

Das Drücken der Schaltflächen „Schüler" oder „Agenda" öffnet jetzt das entsprechende Panel in der Seitenleiste statt den Hauptarbeitsbereich zu ersetzen. Jeder Seitenleisten-Tab (Materialien, Schüler, Agenda) verwaltet seinen eigenen aktiven Zustand unabhängig.

## Arbeitsbereich-Tabs steuern nur die Hauptansicht

Die Tab-Leiste enthält jetzt nur noch Notizbuch, Whiteboard und Meeting. Der aktive Zustand der Arbeitsbereich-Tabs wird separat von den Seitenleisten-Tabs verfolgt.

## Meeting-Verbindungsfehler werden abgefangen

Das Classroom-Meeting-Embed fängt jetzt `[ERROR] [app:conference-web]`-Fehler der Jitsi-API ab. Das Meeting wird ordnungsgemäß geschlossen und der Benutzer erhält eine Fehlermeldung.

## Kachelansicht für Materialien

Klassenunterlagen werden jetzt als visuelles Kachelraster in der Seitenleiste angezeigt. Jede Datei erscheint als Karte mit einem Datei-Typ-Symbol und dem Dateinamen.

## Integrierter Dokumentenviewer

Ein Doppelklick auf eine Materialkachel öffnet einen integrierten Viewer direkt in der Seitenleiste. Bilder werden direkt angezeigt, PDFs eingebettet, andere Dateitypen zeigen einen Download-Link.

## Lehrerübertragung des aktiven Materials

Wenn ein Lehrer eine Materialkachel öffnet, wird die Auswahl über den Echtzeit-Snapshot-Mechanismus an alle Schüler übermittelt. Schüler wechseln automatisch zum Materialien-Panel.

## Navigation zurück zu den Materialien

Eine Schaltfläche „Zurück zu Materialien" in der Viewer-Kopfzeile schließt den Viewer und kehrt zum Kachelraster zurück. Für Lehrer wird dabei auch die Übertragung beendet.

## Kachelbehälter entspricht jetzt den Abmessungen der Einzelansicht

Die Höhe des gestapelten Kachel-Decks wurde an die Einzelpanelansicht angepasst, sodass der Tafelbereich sich beim aktiven Kachel-Layout nicht mehr unnötig vergrößert.

## Whiteboard- und Meeting-Kacheln werden verzögert erstellt

Whiteboard- und Meeting-Kacheln im Unterrichtsraum werden nicht mehr beim Laden der Seite vorgerendert. Jede Kachel wird dem DOM erst beim ersten Aktivieren durch den Nutzer (oder automatisch beim Beitreten für Schüler) hinzugefügt. Nach der Initialisierung bleiben die Kacheln im Deck und behalten ihren Zustand beim Wechsel zwischen ihnen.

## Seitenleiste immer sichtbar mit Schülerliste und Materialien

Die Seitenleiste des Klassenraums zeigt jetzt dauerhaft die Schülerliste oberhalb der Materialien. Der Drei-Reiter-Umschalter (Materialien / Schüler / Agenda) wurde entfernt.

## Agenda nur noch in den Workspace-Kacheln

Agenda ist kein Seitenleisten-Reiter mehr. Sie befindet sich ausschließlich als Standard-Workspace-Kachel im Hauptbereich der Tafel.

## Schüler sehen Agenda schreibgeschützt ohne Lehrersteuerung

Schüler sehen das Agenda-Textfeld schreibgeschützt. Die Snapshot-Speicher- und Öffnen-Steuerelemente sind für Schüler vollständig ausgeblendet.

## Alle Workspace-Schaltflächen immer für Schüler sichtbar

Schüler sehen jetzt immer alle drei Workspace-Schaltflächen (Klassenraum, Whiteboard, Meeting). Nicht verfügbare Schaltflächen werden als deaktiviert dargestellt statt ausgeblendet.

## Meeting-Kachel bleibt sichtbar, wenn ein Meeting läuft

Die Meeting-Workspace-Kachel wird jetzt immer dann gerendert, wenn ein Meeting offen ist, unabhängig davon, welche Kacheln zuvor initialisiert wurden.

## Gestapeltes Kachel-Layout — inaktive Header immer anklickbar

Workspace-Kacheln stapeln sich vertikal in einer Flex-Spalte. Inaktive Kacheln kollabieren auf ihren Header-Balken, der vollständig anklickbar bleibt.

## Fließende Shimmer-Animation auf aktivem Kachel-Header und Tab-Schaltfläche

Die aktive Workspace-Schaltfläche und der aktive Kachel-Header zeigen jetzt eine fließende Shimmer-Animation.

## Meeting-Animation auf Meeting-Schaltfläche und Kachel-Header

Während ein Meeting läuft, zeigen die Meeting-Schaltfläche und der Meeting-Kachel-Header eine bernstein-rote fließende Animation.

## Kritische Korrektur: Meeting-Ausstiegsfänger verhindert Jitsi-Startseiten-Weiterleitung

Der Klick-Navigations-Interceptor im Meeting-Embed blockiert jetzt alle Navigationsvorgänge weg von der Klassenzimmerseite während ein Meeting offen ist, einschließlich externer URLs. Zuvor hatte der Guard eine invertierte Origin-Prüfung, die externe Links fälschlicherweise durchließ. Die Jitsi-iframe-Quelle wird auch vor der Entsorgung geleert, um zu verhindern, dass die Jitsi-Startseite im iframe ausgeführt wird.

## Classroom-Ressourcen und Agenda-Endpunkte behoben (500 / 403 Fehler)

`parseAgendaSnapshots` war versehentlich innerhalb von `parseAttachedFiles` nach dessen
`return`-Anweisung verschachtelt und damit auf Modulebene nicht erreichbar. Jeder Aufruf
in den Ressourcen- und Agenda-Routen warf einen `ReferenceError`. Die Funktion wurde auf
Modulebene verschoben, wodurch die GET/PUT `/resources`-500-Fehler und der
GET `/agenda`-403-Fehler behoben werden.

## „Classroom"-Kachel wechselte bei aktivem Meeting nicht die Ansicht

`updateBoardFocus` hat den Arbeitsbereichsmodus nur dann auf `"agenda"` gesetzt, wenn
zuvor `"chat"` aktiv war. Ein Klick auf die Classroom-Kachel während eines Meetings
ließ die Meeting-Kachel stumm aktiv. Die Bedingung deckt nun jede
Nicht-`"chat"`-Fokusänderung ab.

## Meeting-Verbindung wird beim Wechsel der Arbeitsbereichskacheln nicht mehr unterbrochen

Der Jitsi-`iframe` befand sich in einem `display: none`-Container, wenn eine andere
Kachel aktiv war, sodass Browser den JavaScript-Kontext drosseln konnten. Der
Meeting-Kachel-Inhalt verwendet jetzt `height: 0; overflow: hidden`, damit der `iframe`
in einem aktiven Rendering-Kontext bleibt.

## Jitsi `conference.destroyed` schließt nun das Cognis-Meeting-Fenster

Eine neue `isConferenceDestroyedReason`-Prüfung durchsucht alle External-API-Ereignisfelder.
Sowohl `errorOccurred` als auch `notificationTriggered` rufen `handleMeetingTerminated`
auf, wenn der Grund `conference.destroyed` erkannt wird.

## Redundanter Meeting-Fenster-Header entfernt

Das `classes-meeting-window-header`-Element im Meeting-Embed duplizierte die bereits von
`classes-workspace-tile-hitbox` bereitgestellte Kachelbeschriftung. Element und CSS
wurden entfernt.

## Leerer Whiteboard-Kachel-Bereich zeigt Lehrern nun eine Schaltfläche „Neues Whiteboard"

Bisher zeigte die Whiteboard-Kachel für alle einen einfachen Hinweistext. Lehrer sehen
nun eine Schaltfläche „Neues Whiteboard", die den vorhandenen Auto-Erstellungsfluss auslöst.

## Hochgeladene Dateien erscheinen sofort in der Materialliste

Über das Popup „Lehrermaterialien" hochgeladene Dateien werden automatisch vorausgewählt und sind ohne manuelles Aktualisieren in der Liste sichtbar.

## Upload-Popup in „Lehrermaterialien" umbenannt

Der Titel des Upload-Popups lautete „Kursmaterialien". Er heißt jetzt „Lehrermaterialien", um ihn klar von schülerseitigen Inhalten zu unterscheiden.

## Upload-Schaltfläche durch Symbol ersetzt

Der Text „Datei hochladen" wurde durch ein Upload-Symbol ersetzt.

## Agendaauswahl zeigt Platzhalter bei leerer Liste

Das Dropdown für gespeicherte Agendas zeigt nun „Keine gespeicherten Agendas", wenn keine Snapshots vorhanden sind, und deaktiviert die Öffnen-Schaltfläche. Bei vorhandenen Snapshots ist der erste vorausgewählt.

## Klassenrauminhalt beim Betreten für beide Rollen geladen

Sowohl Lehrer als auch Schüler sehen die Klassenraumansicht jetzt sofort beim Betreten der Klasse.

## Kachelwechsel setzt aktives Meeting nicht mehr zurück

Das Öffnen einer neuen Arbeitsflächen-Kachel während eines laufenden Meetings lädt das Meeting nicht neu. Die Kachelfläche wird ohne Berührung des Meeting-iFrames aktualisiert.

## Lehrer-zu-Schüler-Synchronisierung für alle Ansichten wiederhergestellt

Die Synchronisierung zwischen der aktiven Arbeitsflächenansicht des Lehrers und der jedes Schülers funktioniert jetzt für alle Ansichten (Klassenraum, Agenda, Chat, Whiteboard, Notizblock), nicht nur für Meetings.

## Gestapeltes Kachellayout mit Tiefenfächer

Das standardmäßige Kachellayout zeigt Kacheln als Tiefenfächer. Ein Klick auf eine hintere Kachel bringt sie nach vorne.

## Diashow-Kachellayout

Ein neues Diashow-Layout zeigt jeweils eine Kachel mit Vorwärts- und Rückwärts-Schaltflächen. Die Pfeiltasten navigieren ebenfalls zwischen den Kacheln.

## Schaltfläche zum Wechsel zwischen Kachelansicht und Diashow

Eine Umschaltschaltfläche in der Registerkartenleiste wechselt zwischen dem gestapelten und dem Diashow-Layout. Die Beschriftung zeigt das Layout an, zu dem ein Klick führt.
