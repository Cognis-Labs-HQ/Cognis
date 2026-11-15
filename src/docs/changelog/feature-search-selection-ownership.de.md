# Suchauswahl absichern

**Feature-Zweig:** feature-search-selection-ownership

## Auswahlergebnisse abwarten

Die Suche wartet auf asynchrone Auswahlvorgänge, verhindert doppelte laufende Callbacks und erhält Suchtext, Kategorie und Mehrfachauswahl bei Fehlern nur, solange die zuständige Suchinstanz aktiv bleibt. Ausschließlich false hält den Dialog ohne Fehler offen, solange die zuständige Suchinstanz aktiv bleibt; undefined bleibt erfolgreich. Native Fußzeilenklicks unterstützen Tastatur- und Browserbedienung.

## Lebensdauer der Auswahl beachten

Optionale Lebensdauersignale, Anbieterentfernung und Kontowechsel verhindern veraltete UI-Abschlüsse, ohne ausgelöste Operationen rückgängig zu machen. Die übersetzte Arbeitsplatzanleitung erklärt Warten und die Zielprüfung vor erneuten Versuchen; Ablauf und Wiedergabe bleiben erhalten.

Die Auswahl in der Navigationsleiste gibt ein von `navigateTo` vor dem Routenabbau zurückgegebenes `false` weiter. Bei verweigerter Navigation bleibt die Suche ohne Fehler offen. Sobald `route-will-change` oder `pagehide` ausgelöst wird, schließt die Suche aufgrund ihres Lebenszyklus, auch wenn die Zielseite anschließend nicht eingebunden werden kann. Rückmeldungen zum Ergebnis gehören dann zur Zielseite oder zum Router, nicht zum geschlossenen Suchdialog.

## Commits

- [0f07907ee725d17e798dd597f3a0971fd76333f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/0f07907ee725d17e798dd597f3a0971fd76333f3)
- [6913cf63b8b84af2df6a8c8a50f9fb06543d3df7](https://github.com/Cognis-Labs-HQ/Cognis/commit/6913cf63b8b84af2df6a8c8a50f9fb06543d3df7)
