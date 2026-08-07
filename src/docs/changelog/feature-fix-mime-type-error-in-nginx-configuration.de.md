# Zuverlässige UI-Ressourcen

## Ressourcenfehler werden nicht mehr zwischengespeichert

Web-Proxy und API verhindern nun, dass Antworten für fehlende versionierte JavaScript- und CSS-Dateien als unveränderliche Ressourcen zwischengespeichert werden. Clients können sich nach einer Überschneidung bei der Bereitstellung wieder ordnungsgemäß verbinden, statt eine JSON-404-Antwort für eine Ressourcen-URL beizubehalten.

## Darstellung der Anmeldeseite wiederhergestellt

Der Seiten-Composer stellt seinen Element-Renderer nun für jeden Layout-Pfad bereit. Dadurch schlägt die Anmeldeseite nicht mehr mit dem Fehler `renderElementContent is not defined` fehl, bevor ihre Stile und Inhalte vollständig geladen sind.

## Stabiler Containerstart wiederhergestellt

Der bewährte Docker-Ablauf ist wiederhergestellt: `setup.sh` erzeugt getrennte Umgebungsdateien für Anwendung und Web, der Cognis-Einstieg prüft die Konfiguration, erzeugt `DATABASE_URL`, protokolliert Lebenszyklusereignisse und leitet Beendigungssignale weiter. Das Image `cognis-web` bleibt als getrennte Cache- und TLS-Grenze verfügbar, ohne den etablierten Anwendungsstart zu verändern.
