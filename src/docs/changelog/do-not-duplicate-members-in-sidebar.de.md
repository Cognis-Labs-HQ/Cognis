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
