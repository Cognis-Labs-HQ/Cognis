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
