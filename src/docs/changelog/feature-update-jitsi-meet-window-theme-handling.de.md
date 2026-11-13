# Jitsi-Theme-Abgleich

**Feature-Zweig:** feature-update-jitsi-meet-window-theme-handling

## Sofortige Theme-Updates für Jitsi Meet

Das Jitsi-Meet-Fenster erhält das aktive App-Theme jetzt direkt bei jeder Änderung des App-Themes. Dadurch wechselt das eingebettete Meeting sofort zwischen hellem und dunklem Modus, statt auf den gespeicherten Theme-Status zu warten.

## Eingebettete Jitsi-Flächen folgen dem Theme

Das Meeting-Embed wendet die Cognis-Farben für Hell- und Dunkelmodus nun beim Laden des Meetings und beim Wechsel des App-Themes erneut auf den Jitsi-Iframe, die Werkzeugleiste, den Teilnehmer-Filmstreifen und die Teilnehmerkarten an.

## Theme-Wechsel erneuern veraltete Embeds

Wenn sich das aktive Cognis-Theme während eines laufenden Meetings ändert, lädt das Embed das Jitsi-Fenster mit der neuen Interface-Konfiguration neu, damit auch Bereitstellungen, die Live-Aktualisierungen von `preferredTheme` ignorieren, das richtige Theme übernehmen.

## Änderungen

- [8344f54](https://github.com/Cognis-Labs-HQ/Cognis/commit/8344f54c3af4936f1812de28754555ba886a945c)
