# Einheitliche Avatare

**Feature-Zweig:** feature-messages-conversation-initials

## Profildarstellung verwenden

Nachrichtenautoren verwenden den aktuellen Profile-Renderer für Initialen, Farbe und die kleine Avatargröße (32px). Initialen folgen dem Anzeigenamen, danach dem Handle; fehlt beides, bleibt die Kontokennung als Beschriftung erhalten. Vorhandene Avatarbilder und Profillinks bleiben in Stilen mit Avataren verfügbar. Darüberfahren öffnet die übliche Profilvorschau, Anklicken das Profil. IRC blendet Avatare weiterhin aus.

## Gesprächsverhalten bewahren

Die Vorschau des Nachrichtenstils in den Einstellungen nutzt dieselbe kleine Darstellung mit Beispieldaten, ohne Profillinks, Bilder, nachträgliches Laden oder Schreibvorgänge. Fehlende, deaktivierte oder unvollständige Profile-Anbieter machen die Vorschau unverfügbar; zurückkehrende Anbieter stellen sie wieder her. Gesprächszeilen behalten ihre Seiten- und Kontozuordnung, Textauswahl, Entwürfe und Leseergebnisse. Raumköpfe, Teilnehmerübersichten und andere Avatarflächen bleiben unverändert; die übergreifende Avatarprüfung bleibt teilweise offen.

Messages 2.8.3 / Profile 4.0.0.

## Commits

- [f714d0e65e81c7cfc76fabe863f7eeb3289709c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f714d0e65e81c7cfc76fabe863f7eeb3289709c4)
