# Kalender-Gateway

## Zustellung von Freigaben

Calendar erweitert das Share-Gateway über `ctx`-Flow-Hooks und Fähigkeiten. Die Zustellung an Benutzer legt einen eigenen geteilten Kalender für die empfangende Person an und gibt eine allgemeine Navigations-URL sowie eine einmalige lokalisierte Erfolgsmeldung zurück. Passwörter verbleiben im Besitz von Share und werden unter der kanonischen Freigabekennung aus dem Schlüsselbund gelesen.

## Öffentliche Freigabedarstellung

Calendar stellt `/static/gateways/calendar/ui/share-renderer.js` als `mountScriptUrl` für Kalenderlinks bereit. Share übergibt den aufgelösten Kalenderinhalt, gewährte Fähigkeiten, das begrenzte Gast-Token, Übersetzungen und das Abbruchsignal an `mount(root, options)`. Der Adapter-Renderer zeigt eine einzelne Kalenderkarte mit Tages-, Wochen-, Monats- und Jahresumschaltung sowie der üblichen Zeitrastertabelle; andere Kalender und Dashboard-Steuerelemente der empfangenden Person werden nie geladen. Nur das Zeitraster scrollt vertikal, entsprechend der angemeldeten Kalenderkarte. Lesefreigaben zeigen Ereignisse. Freigaben mit `calendar:write` können über `/api/v1/calendar/shared/:calendarId/events` und das Gast-Token Ereignisse anlegen, bearbeiten und löschen.

## Interaktionsgrenze des Kalenders

Die angemeldete Kalenderseite delegiert Ansichts-, Zeitraum- und Zeitrasteraktionen vom dauerhaften Seitenstamm, sodass Composer-Neudarstellungen keine Steuerelemente trennen. Die Ereigniserstellung filtert zunächst alle Kalender mit der üblichen Schreibregel; bleibt kein Ziel übrig, erscheint die lokalisierte Meldung für fehlende beschreibbare Kalender statt des Formulars. Öffentliche beschreibbare Freigaben authentifizieren Ereignisänderungen mit ihrem begrenzten Gast-Token.

## Integration in die Share-Shell

Calendar folgt dem bewährten Lebenszyklus für Meeting-Freigaben: Share entfernt seinen Lade-Composer und übergibt Seitenstamm, aufgelösten Kontext, Übersetzungen und Abbruchsignal an Calendar. Calendar besitzt danach eine vollständige `createPageComposer`-Seite mit Standard-Kopfzeile, Theme-Steuerung und Fußzeile, aber ohne Kontonavigation. Das einzelne Kalenderelement importiert Formular-, Popup-, Zeitstempel- und Ansichtsabhängigkeiten direkt; Ereignisänderungen werden mit dem übergebenen begrenzten Gast-Token authentifiziert.

## Verfügbarkeitsstatus

Kalendertermine aktualisieren die Verfügbarkeit eines Benutzers, wenn sie beginnen oder im aktuellen Zeitraum erstellt werden. Ein danach manuell gewählter Status hat Vorrang, bis ein weiterer Termin beginnt. Benutzer können kalendergesteuerte Statusaktualisierungen unter Benutzereinstellungen → Allgemein deaktivieren.

## Alte Kalenderaufrufe stoppen

Beim Verlassen des Kalenders wird überholte Initialisierung vor Änderungen an Seite oder URL beendet. Das Routensignal erreicht den Seitenaufbau; verspätete Kalender-, Ereignis- und Einladungsantworten können eine bereits ersetzte Zielseite nicht erneut aufbauen. Abgebrochene Initialisierung zeigt keine verspätete Fehlermeldung und startet den Verfügbarkeitstimer nicht erneut.

## Kalender schneller laden

Der Kalender lädt Einladungen gleichzeitig mit der Kalenderliste und startet Ereignisabfragen, sobald die Liste bereitsteht. Der Seitenaufbau wartet weiterhin auf die erforderlichen Abfragen. Bei Fehlern der Einladungsabfrage bleibt die bisherige leere Einladungsliste erhalten. Jede Navigation lädt aktuelle Daten. Abbruchprüfungen verhindern den Aufbau überholter Seiten durch verspätete Antworten.

## Erinnerungen auswählen

Mehrere Erinnerungen lassen sich mit den üblichen sichtbaren Kontrollkästchen auswählen und gemeinsam speichern. Werden alle abgewählt, bleiben Erinnerungen auch bei Kalenderstandardwerten deaktiviert. Bestehende benutzerdefinierte Zeitabstände bleiben beim Bearbeiten verfügbar.

Beim Erstellen verwendet ein fehlendes `reminderOffsetsMinutes` die Kalenderstandardwerte; ein ausdrücklich leeres Array deaktiviert Erinnerungen. Änderungen ohne dieses Feld erhalten die bestehende Auswahl.

## Offline-Assets und Kalender

Nach bestätigter Anmeldung speichert Calendar Kalenderlisten, Einladungen und eigene Termine mit höchstens zwei gleichzeitigen Hintergrundanfragen. Eine Cache-Invalidierung erneuert diese Schnappschüsse, ohne die Anmeldung aufzuhalten. Gespeicherte Termine bleiben lesbar; neue Termine, Änderungen, Löschungen, Antworten, Statuspräferenzen und Kalenderänderungen werden gepuffert. Neue und geänderte Termine erscheinen in den zwischengespeicherten Listen. Neue Termine nutzen eine stabile Vorgangs-UUID; Wiederholungen liefern den vorhandenen Termin ohne weitere Serie oder erneuten Einladungsversand. Geänderte oder kontofremde Wiederverwendung wird abgelehnt. Beim Übertragen prüft der Server erneut die Berechtigung.

Kalender-Schnappschüsse bleiben im Tab und sind auf 4 MB und 100 Lesevorgänge begrenzt. Für die gemeinsame Warteschlange gelten weiterhin 1 MB, 1.000 Einträge und sieben Tage. Neue Serientermine zeigen bis zur serverseitigen Erweiterung den ersten Termin. Neue Kalender, Meetings, Freigaben, Passwortverwaltung und Gastzugänge benötigen eine Verbindung; Freigabepasswörter werden niemals gepuffert. Messages benötigt eine gespeicherte Raumliste, Study gespeicherte Sprach- und Präferenzdaten, bevor Offline-Navigation freigegeben wird.

## Dauerhaft vorgemerkte Änderungen

Vorgemerkte neue Termine und spätere Änderungen erscheinen in zwischengespeicherten Listen und Detailfenstern. Gleichzeitige Übermittlungen teilen sich eine Anfrage. Fehler optionaler Aktivitätserfassung, Verfügbarkeitsanzeige oder Ansichtsaktualisierung machen einen gespeicherten Termin nicht zu einer fehlgeschlagenen Erstellung. Die Übertragung verwendet dieselbe Termin-UUID und die aktuellen Serverberechtigungen.
