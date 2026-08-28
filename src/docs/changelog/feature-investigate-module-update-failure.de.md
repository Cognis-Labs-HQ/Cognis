# Zuverlässige Modulupdates

**Feature Branch:** feature-investigate-module-update-failure

## Gelöschte Kanäle erholen sich

Wenn ein installierter Veröffentlichungskanal gelöscht wurde, legt ein Marketplace-Scan nun den verfügbaren Updatekanal auf den Standardzweig des Repositorys, anstatt einen unbrauchbaren zwischengespeicherten Kanal beizubehalten. Das Modul kann danach normal aktualisiert werden.

## Validierungsfehler sind klar

Fehler bei der Modulvalidierung während der Aktivierung liefern nun einen sicheren, strukturierten API-Fehler. Die Administration zeigt eine übersetzte Fehlermeldung zur Validierung und verweist auf das Serverprotokoll, anstatt einen allgemeinen Anfragefehler anzuzeigen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/dd9dbd55d239ace38a65225c05d67b40c4c2f2fd
