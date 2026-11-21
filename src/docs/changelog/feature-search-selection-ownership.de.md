# Suchauswahl absichern

**Feature-Zweig:** feature-search-selection-ownership

## Auswahlergebnisse abwarten

Die Suche wartet auf asynchrone Auswahlvorgänge, verhindert doppelte laufende Callbacks und erhält Suchtext, Kategorie und Mehrfachauswahl bei Fehlern nur, solange die zuständige Suchinstanz aktiv bleibt. Ausschließlich false hält den Dialog ohne Fehler offen, solange die zuständige Suchinstanz aktiv bleibt; undefined bleibt erfolgreich. Native Fußzeilenklicks unterstützen Tastatur- und Browserbedienung.

## Lebensdauer der Auswahl beachten

Optionale Lebensdauersignale, Anbieterentfernung und Kontowechsel verhindern veraltete UI-Abschlüsse, ohne ausgelöste Operationen rückgängig zu machen. Die übersetzte Arbeitsplatzanleitung erklärt Warten und die Zielprüfung vor erneuten Versuchen; Ablauf und Wiedergabe bleiben erhalten.

Die Auswahl in der Navigationsleiste gibt ein von `navigateTo` vor dem Routenabbau zurückgegebenes `false` weiter. Bei verweigerter Navigation bleibt die Suche ohne Fehler offen. Sobald `route-will-change` oder `pagehide` ausgelöst wird, schließt die Suche aufgrund ihres Lebenszyklus, auch wenn die Zielseite anschließend nicht eingebunden werden kann. Rückmeldungen zum Ergebnis gehören dann zur Zielseite oder zum Router, nicht zum geschlossenen Suchdialog.

## Commits

- [e525efe46929da164daf08778861d64bcc351342](https://github.com/Cognis-Labs-HQ/Cognis/commit/e525efe46929da164daf08778861d64bcc351342)
- [bb1e2f1722ed24d10b2f24f84ad38be33932c788](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb1e2f1722ed24d10b2f24f84ad38be33932c788)
