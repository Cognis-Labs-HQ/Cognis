# Zuverlässige UI-Ressourcen

## Ressourcenfehler werden nicht mehr zwischengespeichert

Web-Proxy und API verhindern nun, dass Antworten für fehlende versionierte JavaScript- und CSS-Dateien als unveränderliche Ressourcen zwischengespeichert werden. Clients können sich nach einer Überschneidung bei der Bereitstellung wieder ordnungsgemäß verbinden, statt eine JSON-404-Antwort für eine Ressourcen-URL beizubehalten.

## Darstellung der Anmeldeseite wiederhergestellt

Der Seiten-Composer stellt seinen Element-Renderer nun für jeden Layout-Pfad bereit. Dadurch schlägt die Anmeldeseite nicht mehr mit dem Fehler `renderElementContent is not defined` fehl, bevor ihre Stile und Inhalte vollständig geladen sind.

## Web-Proxy löst Laufzeit-Dienstnamen auf

Nginx löst den Cognis-Anwendungsdienst nun über die standardmäßige Hostnamenauflösung der Container-Umgebung auf. Dadurch werden dieselben Suchdomänen und Hostzuordnungen wie bei anderen Werkzeugen in Docker, Kubernetes, Podman und weiteren Container-Plattformen verwendet. Fehler mit `no live upstreams` werden vermieden, wenn der Hostname an anderer Stelle im Web-Container funktioniert.

Der Web-Proxy übernimmt den Hostnamen des Anwendungsdienstes aus `HOST`, statt den Dienstnamen `cognis` vorauszusetzen. Namespace-qualifizierte Namen mit Punkten wie `cognis.cognis` werden unterstützt, damit der Upstream-Pool in Kubernetes und anderen Bereitstellungen mit abgegrenzten Dienstnamen verfügbar bleibt.

## Klarere Kubernetes-Umgebungsfehler

Beim Containerstart werden erforderliche Einstellungen nun direkt aus der exportierten Prozessumgebung gelesen, und Fehlermeldungen zu fehlenden Einstellungen nennen ausdrücklich den Cognis-Anwendungscontainer. Kubernetes-Bereitstellungen müssen `CONTACT_EMAIL` am Anwendungscontainer setzen; eine Einstellung nur im Sidecar `cognis-web` wird nicht zwischen Containern geteilt.
