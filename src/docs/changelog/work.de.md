# Jitsi-Theme-Korrektur

## Eingebettete Jitsi-Flächen folgen dem Theme

Das Meeting-Embed wendet die Cognis-Farben für Hell- und Dunkelmodus nun beim Laden des Meetings und beim Wechsel des App-Themes erneut auf den Jitsi-Iframe, die Werkzeugleiste, den Teilnehmer-Filmstreifen und die Teilnehmerkarten an.

## Theme-Wechsel erneuern veraltete Embeds

Wenn sich das aktive Cognis-Theme während eines laufenden Meetings ändert, lädt das Embed das Jitsi-Fenster mit der neuen Interface-Konfiguration neu, damit auch Bereitstellungen, die Live-Aktualisierungen von `preferredTheme` ignorieren, das richtige Theme übernehmen.
