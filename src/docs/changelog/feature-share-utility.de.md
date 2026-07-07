# Share Utility

## Share-Gateway hinzufügen

Cognis enthält jetzt ein eigenes Share-Gateway, das öffentliche Share-Tokens erstellt, auflistet, widerruft und auflöst. Das Gateway registriert kanonische Share-Flows, speichert Share-Tokens in der DB und stellt eine öffentliche `/share/:token`-Seite bereit, die auf dem Standard-Page-Composer mit reduzierter Shell basiert.

## Meetings teilen

Das Jitsi-Meet-Modul steuert jetzt Share-Flow-Hooks für Meeting-Ressourcen bei, stellt Routen zur Verwaltung von Meeting-Freigaben bereit und rendert einen Share-Button im Meeting-Bereich. Meeting-Besitzer können ablaufende Freigabelinks erzeugen, sie aus einem Popup kopieren und später widerrufen.

## Bugfix: Meetings-Seite lädt vollständig

Das Share-Popup-Modul wird jetzt erst bei Bedarf geladen, wenn der Nutzer das Share-Dialogfeld öffnet, anstatt beim Laden der Meetings-Seite sofort importiert zu werden. Dadurch wird verhindert, dass ein fehlgeschlagener Abruf des Share-Popups das gesamte Meetings-Seitenmodul abbricht.
