# Sichereres DOM-Parking

**Feature Branch:** feature-add-opt-in-flag-for-dom-parking

## DOM-Parking ist jetzt optional

Der Page Composer baut Seiteninhalte nun standardmäßig neu auf, damit geparktes DOM keine vom Benutzer aktualisierten Daten verdeckt. Seiten können Parking für zustandsbehaftete Medien ausdrücklich aktivieren.

## Jitsi Meet behält seine aktive Sitzung

Die eingebettete Jitsi-Meet-Seite aktiviert vollständiges DOM-Parking, damit ihr zustandsbehafteter Iframe Composer-Layoutaktualisierungen ohne erneute Verbindung übersteht.

## Commits

- [44d57a9](https://github.com/Cognis-Labs-HQ/Cognis/commit/44d57a98837df3d5ed38f8bd17413fa3e2a32904)
