# Zuverlässige UI-Ressourcen

## Ressourcenfehler werden nicht mehr zwischengespeichert

Web-Proxy und API verhindern nun, dass Antworten für fehlende versionierte JavaScript- und CSS-Dateien als unveränderliche Ressourcen zwischengespeichert werden. Clients können sich nach einer Überschneidung bei der Bereitstellung wieder ordnungsgemäß verbinden, statt eine JSON-404-Antwort für eine Ressourcen-URL beizubehalten.
