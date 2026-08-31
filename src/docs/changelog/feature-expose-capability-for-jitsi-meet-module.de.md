# Jitsi-Freigabegenehmigung

**Feature-Zweig:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet kann Freigaben genehmigen lassen

Das Share-Gateway stellt seine Genehmigungsanfrage jetzt als Capability `share:requestApproval` bereit und übernimmt den vom Aufrufer gelieferten Anzeigenamen für die Genehmigung neuer Jitsi-Meet-Teilnehmender. Dadurch kann das Modul erfolgreich aktiviert werden und den vorhandenen Genehmigungsablauf verwenden.

## Genehmigungsdialoge unterstützen Kontext

Capability-Aufrufer können eine Genehmigungsaktion und ein Ziel angeben, etwa das Hinzufügen eines Teilnehmenden zu einer benannten Besprechung. Ohne diese Angaben verwenden Dialoge weiterhin die bisherige Freigabelink-Aktion und den Ressourcentyp als Ziel.

## Präsenzanzeigen bleiben beim Navigieren erhalten

Die Profil-Verfügbarkeitsstile bleiben jetzt als Stile der Dashboard-Shell geladen statt einer Route zu gehören. Beim Verlassen von Jitsi Meet verschwinden Präsenzanzeigen daher nicht mehr aus Navigationsavataren oder anderen Profilbereichen.

## PiP-Größenänderung bleibt zuverlässig

Die Größenänderungsgriffe schwebender Fenster starten nicht mehr gleichzeitig die darunterliegende Verschiebegeste. Der Größenänderungszustand wird außerdem bei Loslassen, Abbruch oder verlorenem Pointer-Capture beendet, sodass Mausbewegungen eine abgeschlossene Größenänderung nicht fortsetzen.

## Kontext im Freigabe-Popup maskieren

Werte für Antragsteller, Aktion und Ziel werden nun HTML-maskiert, bevor sie im Dashboard einer genehmigenden Person dargestellt werden.

## Freigabe-Orchestrierung als Flow bereitstellen

Die Share-Freigabefähigkeit führt nun einen benannten Flow mit expliziten Stufen für Zielauflösung, Antragserstellung, Warten auf Antworten und Entscheidung aus, sodass Komponenten entfernbare Hooks einfügen können.

## Implementierungsänderungen

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ebef6ab4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/da3dc593
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1452294f
