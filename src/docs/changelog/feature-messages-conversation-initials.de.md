# Einheitliche Avatare

**Feature-Zweig:** feature-messages-conversation-initials

## Profildarstellung verwenden

Nachrichtenautoren verwenden den aktuellen Profile-Renderer für Initialen, Farbe und die kleine Avatargröße (32px). Initialen folgen dem Anzeigenamen, danach dem Handle; fehlt beides, bleibt die Kontokennung als Beschriftung erhalten. Vorhandene Avatarbilder und Profillinks bleiben in Stilen mit Avataren verfügbar. Darüberfahren öffnet die übliche Profilvorschau, Anklicken das Profil. IRC blendet Avatare weiterhin aus.

## Gesprächsverhalten bewahren

Die Vorschau des Nachrichtenstils in den Einstellungen nutzt dieselbe kleine Darstellung mit Beispieldaten, ohne Profillinks, Bilder, nachträgliches Laden oder Schreibvorgänge. Fehlende, deaktivierte oder unvollständige Profile-Anbieter machen die Vorschau unverfügbar; zurückkehrende Anbieter stellen sie wieder her. Gesprächszeilen behalten ihre Seiten- und Kontozuordnung, Textauswahl, Entwürfe und Leseergebnisse. Raumköpfe, Teilnehmerübersichten und andere Avatarflächen bleiben unverändert; die übergreifende Avatarprüfung bleibt teilweise offen.

Messages 2.8.3 / Profile 4.0.0.

## Commits

- [fd1fe261927f62c17a9d8b7739de6bf172cdf36d](https://github.com/Cognis-Labs-HQ/Cognis/commit/fd1fe261927f62c17a9d8b7739de6bf172cdf36d)
- [314f4cb0113cd59133c7461e672d82cbeecf0353](https://github.com/Cognis-Labs-HQ/Cognis/commit/314f4cb0113cd59133c7461e672d82cbeecf0353)
