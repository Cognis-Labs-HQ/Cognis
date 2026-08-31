# Jitsi-Freigabegenehmigung

**Feature-Zweig:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet kann Freigaben genehmigen lassen

Das Share-Gateway stellt seine Genehmigungsanfrage jetzt als Capability `share:requestApproval` bereit und übernimmt den vom Aufrufer gelieferten Anzeigenamen für die Genehmigung neuer Jitsi-Meet-Teilnehmender. Dadurch kann das Modul erfolgreich aktiviert werden und den vorhandenen Genehmigungsablauf verwenden.

## Implementierungsänderungen

- https://github.com/Cognis-Labs-HQ/Cognis/commit/cd8a5d46
