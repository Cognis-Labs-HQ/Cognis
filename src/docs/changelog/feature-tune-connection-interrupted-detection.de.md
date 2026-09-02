# Zuverlässige Wiederverbindung

**Feature-Zweig:** feature-tune-connection-interrupted-detection

## Verbindungsabbrüche bestätigen

Verbindungswarnungen erfordern nun eine fehlgeschlagene, gleichursprüngliche Statusprüfung. Dadurch lösen andere API-Antworten und Fehler keinen falschen Unterbrechungszustand mehr aus. Der Wiederherstellungszustand wird pro Cognis-Ursprung getrennt, sodass sich verschiedene Installationen nicht gegenseitig beeinflussen.

## Nach Wiederherstellung aktualisieren

Cognis prüft nach einer bestätigten Unterbrechung, ob der Dienst wieder verfügbar ist, lässt die Unterbrechungswarnung sichtbar, während eine Informationsmeldung zur Wiederherstellung hinzukommt, und aktualisiert die Seite, sobald die Wiederherstellungsmeldung abläuft. Wird diese Meldung manuell geschlossen, entfällt die Aktualisierung, damit Entwickler den wiederhergestellten Seitenzustand untersuchen können.

## Commits

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)
- [16536120](https://github.com/Cognis-Labs-HQ/Cognis/commit/16536120a1eb3de2bceda8db1a0b19ff73bf4e22)
- [9b9ed168](https://github.com/Cognis-Labs-HQ/Cognis/commit/9b9ed168bd6d841e229b2611a2c2f2f0db626c25)
