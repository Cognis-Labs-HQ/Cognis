# Kalender-Gateway

## Zustellung von Freigaben

Calendar erweitert das Share-Gateway über `ctx`-Flow-Hooks und Fähigkeiten. Die Zustellung an Benutzer legt einen eigenen geteilten Kalender für die empfangende Person an und gibt eine allgemeine Navigations-URL sowie eine einmalige lokalisierte Erfolgsmeldung zurück. Passwörter verbleiben im Besitz von Share und werden unter der kanonischen Freigabekennung aus dem Schlüsselbund gelesen.

## Öffentliche Freigabedarstellung

Calendar stellt `/static/gateways/calendar/ui/share-renderer.js` als `mountScriptUrl` für Kalenderlinks bereit. Share übergibt den aufgelösten Kalenderinhalt, gewährte Fähigkeiten, das begrenzte Gast-Token, Übersetzungen und das Abbruchsignal an `mount(root, options)`. Lesefreigaben zeigen Ereignisse; Freigaben mit `calendar:write` können zusätzlich über `/api/v1/calendar/shared/:calendarId/events` und das Gast-Token neue Ereignisse anlegen.
