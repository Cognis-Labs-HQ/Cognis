# Zuverlässige UI-Ressourcen

## Ressourcenfehler werden nicht mehr zwischengespeichert

Web-Proxy und API verhindern nun, dass Antworten für fehlende versionierte JavaScript- und CSS-Dateien als unveränderliche Ressourcen zwischengespeichert werden. Clients können sich nach einer Überschneidung bei der Bereitstellung wieder ordnungsgemäß verbinden, statt eine JSON-404-Antwort für eine Ressourcen-URL beizubehalten.

## Darstellung der Anmeldeseite wiederhergestellt

Der Seiten-Composer stellt seinen Element-Renderer nun für jeden Layout-Pfad bereit. Dadurch schlägt die Anmeldeseite nicht mehr mit dem Fehler `renderElementContent is not defined` fehl, bevor ihre Stile und Inhalte vollständig geladen sind.

## Web-Proxy folgt ersetzten App-Containern

Nginx erkennt nun den DNS-Resolver der aktiven Container-Laufzeit und aktualisiert damit die Adresse der Cognis-Anwendung. Öffentliche Anfragen bleiben nicht mehr mit einem ersetzten Anwendungscontainer verbunden, unabhängig davon, ob Cognis mit Docker, Kubernetes, Podman oder einer anderen Container-Plattform ausgeführt wird.
