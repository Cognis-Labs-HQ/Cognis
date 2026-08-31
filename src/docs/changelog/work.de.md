# Jitsi-Freigabegenehmigung

## Jitsi Meet kann Freigaben genehmigen lassen

Das Share-Gateway stellt seine Genehmigungsanfrage jetzt als Capability `share:requestApproval` bereit und übernimmt den vom Aufrufer gelieferten Anzeigenamen für die Genehmigung neuer Jitsi-Meet-Teilnehmender. Dadurch kann das Modul erfolgreich aktiviert werden und den vorhandenen Genehmigungsablauf verwenden.

**Feature-Zweig:** work

## Implementierungsänderungen

- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8f62831
- https://github.com/Cognis-Labs-HQ/Cognis/commit/4fc46aaf
