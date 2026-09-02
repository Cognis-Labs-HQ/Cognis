# Zuverlässige Wiederverbindung

**Feature-Zweig:** work

## Verbindungsabbrüche bestätigen

Verbindungswarnungen erfordern nun eine fehlgeschlagene, gleichursprüngliche Statusprüfung. Dadurch lösen andere API-Antworten und Fehler keinen falschen Unterbrechungszustand mehr aus. Der Wiederherstellungszustand wird pro Cognis-Ursprung getrennt, sodass sich verschiedene Installationen nicht gegenseitig beeinflussen.

## Nach Wiederherstellung aktualisieren

Cognis prüft nach einer bestätigten Unterbrechung, ob der Dienst wieder verfügbar ist, ersetzt die Warnung durch eine Informationsmeldung und aktualisiert die Seite, sobald diese Meldung verschwindet.

## Commits

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)
