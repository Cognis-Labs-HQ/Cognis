# Jitsi-Freigabegenehmigung

**Feature-Zweig:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet kann Freigaben genehmigen lassen

Das Share-Gateway stellt seine Genehmigungsanfrage jetzt als Capability `share:requestApproval` bereit und übernimmt den vom Aufrufer gelieferten Anzeigenamen für die Genehmigung neuer Jitsi-Meet-Teilnehmender. Dadurch kann das Modul erfolgreich aktiviert werden und den vorhandenen Genehmigungsablauf verwenden.

## Genehmigungsdialoge unterstützen Kontext

Capability-Aufrufer können eine Genehmigungsaktion und ein Ziel angeben, etwa das Hinzufügen eines Teilnehmenden zu einer benannten Besprechung. Ohne diese Angaben verwenden Dialoge weiterhin die bisherige Freigabelink-Aktion und den Ressourcentyp als Ziel.

## Implementierungsänderungen

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b7c97f73
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48c243e6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e28efff
