# Einheitliche Änderungen sozialer Mitgliedschaften

**Feature-Zweig:** feature-document-api-standard-for-membership-changes

## Einfache Mitgliedschafts-APIs und Capabilities

Chatraum-Mitglieder und Profil-Follower verwenden nun eine dokumentierte `POST`-/`DELETE`-Konvention für Sammlungen sowie passende `ctx`-Capabilities für vertrauenswürdige Komponentenintegration.

## Mitgliedschafts-Capability für Module exportiert

Der Messages-Adapter veröffentlicht die Chatraum-Mitgliedschaft jetzt sowohl über den System-`ctx` als auch über den Capability-Speicher des Gateways. Externe Module wie Jitsi Meet können sie dadurch beim Aktivieren und Starten auflösen.

## Meeting-Chat-Mitgliedschaft beim erneuten Beitritt wiederhergestellt

Das Hinzufügen eines Chatraum-Mitglieds stellt nun auch eine archivierte Mitgliedschaft wieder her. Meeting-Integrationen können die idempotente Mitgliedschaftsoperation `add` vor dem Laden des Chats bei jedem Beitritt sicher aufrufen. Dadurch werden wiederholte `403`-Antworten vermieden, nachdem ein Teilnehmer den Chat zuvor verlassen hat.

## Review-Rückmeldungen umgesetzt

Der bisherige Singular-Endpunkt `/follow` bleibt neben `/followers` für schrittweise Bereitstellungen und zwischengespeicherte Clients verfügbar. Die Capability für Profil-Follower wird jetzt sowohl über den Gateway-Speicher als auch über den System-`ctx` veröffentlicht, und das Social-Gateway meldet die Version aus seinem Manifest.

## Commits

- [c9a478c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9a478cfe93519e006eeb6098bc4023d9883b01b)
- [614b5c54](https://github.com/Cognis-Labs-HQ/Cognis/commit/614b5c54)
