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
