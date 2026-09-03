# Grundlagen für Videoanrufe in Messages

**Feature-Zweig:** feature-expose-voip-calling-capability-in-messages-page

## Anbieterneutrale Anrufaktion im Chat

Direkt- und Gruppenchats zeigen nun eine barrierefreie Videokamera-Aktion, sobald ein Browser-VoIP-Anbieter verfügbar ist. Die Aktion übergibt die vollständige Raummitgliedschaft und eine Bild-im-Bild-Darstellungsanforderung über einen gestuften ctx-Flow, ohne Messages an Jitsi zu koppeln.

## Modul-VoIP-Anbieter laden vor Messages

Externe Module können nun Browser-Capabilities für ihre registrierten Navigations-Plug-ins deklarieren. Cognis nimmt diese Skripte in die Erkennung von Capability-Anbietern auf, sodass Jitsi `voip:startCall` bereitstellen kann, bevor Messages die Verfügbarkeit prüft und die Videokamera-Aktion darstellt.

## Raumbezogene VoIP-Aktionen

Messages fragt den Anbieter nun für jeden Raum nach einer Aktion. Anbieter können Anrufe ausblenden, ein vom Host verwaltetes Komponentenfenster mit Meeting-Kontext anfordern oder zu einem bestehenden Meeting weiterleiten. Temporäre Komponentenbühnen werden nach dem Schließen entfernt; fehlgeschlagene Starts werden protokolliert und als Toast angezeigt, ohne die Chathöhe zu verändern.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9b6cc0e4d3118f80765af56f2b503c0e73aa1c10
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fddbcbf8999173159b88ee4efddf284e426b9a67
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c16bf732cf74c071bc41201a303f57d3f561e30
