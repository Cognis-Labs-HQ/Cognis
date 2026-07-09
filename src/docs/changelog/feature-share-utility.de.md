# Share Utility

## Share-Gateway hinzufügen

Cognis enthält jetzt ein eigenes Share-Gateway, das öffentliche Share-Tokens erstellt, auflistet, widerruft und auflöst. Das Gateway registriert kanonische Share-Flows, speichert Share-Tokens in der DB und stellt eine öffentliche `/share/:token`-Seite bereit, die auf dem Standard-Page-Composer mit reduzierter Shell basiert.

## Meetings teilen

Das Jitsi-Meet-Modul steuert jetzt Share-Flow-Hooks für Meeting-Ressourcen bei, stellt Routen zur Verwaltung von Meeting-Freigaben bereit und rendert einen Share-Button im Meeting-Bereich. Meeting-Besitzer können ablaufende Freigabelinks erzeugen, sie aus einem Popup kopieren und später widerrufen.

## Generisches Freigabelink-Popup

Das Freigabe-Popup wurde aus dem Jitsi-Meet-Modul in ein generisches Dienstprogramm `openShareLinksPopup` in `src/ui/reuse/share-links-popup.js` extrahiert. Es akzeptiert API-Callback-Funktionen und Bezeichnungsstrings als Parameter und ist somit für jede Funktion wiederverwendbar. Der Import verwendet nun einen absoluten Pfad, wodurch ein dynamischer Import-Fehler auf der Meetings-Seite behoben wird.

## Ladefehler auf der Meetings-Seite durch 401 auf share-adapter.js behoben

Der statische Top-Level-Import von `share-adapter.js` in der Meetings-`app.js` löste beim
Parsen des Moduls eine 401-Antwort aus, bevor die Benutzersitzung eine Authentifizierungsprüfung
erfüllen konnte. Dadurch wurde der Import abgebrochen und die gesamte `/meetings`-SPA-Route
konnte nicht geladen werden. `share-adapter.js` wird jetzt als lazy dynamischer Import zusammen
mit `share-links-popup.js` innerhalb des Share-Button-Click-Handlers geladen, sodass die Datei
erst angefordert wird, wenn sich der Nutzer in einer authentifizierten Sitzung befindet und
bewusst das Share-Popup öffnet.

## Verwaiste Jitsi-Meet-Dateien entfernt

Die veralteten Dateien `ui/app/index.js` und `ui/pages/meetings.html` im Jitsi-Meet-Modul wurden
durch ein früheres Refactoring zu totem Code und werden im Browser nie ausgeliefert. `index.js`
enthielt einen fehlerhaften Import (`/static/reuse/page-composer.js` statt
`/static/reuse/page-composer/index.js`), der bei einem eventuellen Aufruf einen Ladefehler
verursacht hätte. Beide Dateien wurden entfernt.

## Öffentliche Freigabelinks durch Auth-Check blockiert – behoben

Der Kalender-Gateway-Route-Handler verwendete eine zu weit gefasste Prüfung
`pathname.includes("/share")`, die versehentlich öffentliche Freigabe-Link-URLs
(`/share/shr_...`) abfing und einen Unauthorized-Fehler zurückgab, bevor das
Share-Gateway die Seite ausliefern konnte. Die Prüfung ist nun auf
kalenderspezifische Share-API-Routen unter `/api/v1/calendar/calendars/:id/share`
beschränkt.

## Fokus des Eingabefelds für Labels im Share-Popup korrigiert

Wenn das Share-Links-Popup geöffnet wird, erhält das Label-Eingabefeld nun
automatisch den Fokus. Zuvor wurde fälschlicherweise der Schließen-Button (der
erste Button im Popup-DOM) fokussiert, was direkte Tastatureingaben im Label-Feld
verhinderte.
