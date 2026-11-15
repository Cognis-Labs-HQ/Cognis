# Verlässliche Löschergebnisse

**Feature-Zweig:** feature-cli-deletion-integration635

## Kontoergebnisse unterscheiden

Die Kontolöschung unterscheidet bestätigte Löschung mit unvollständiger Bereinigung, maßgebliche Ablehnung und unbekanntes Ergebnis. Normales HTTP 200 bleibt unverändert. Bestehender Ablehnungsstatus, Code und sichere Nachricht bleiben erhalten; ausdrückliche Ergebnisdaten werden ergänzt. Echte Flow-Ausnahmen behalten ihre ursprüngliche Zuordnung zur Komponentenwiederherstellung.

Abgeschlossene Abläufe mit nicht verfügbaren Belegen behalten die bisherigen HTTP-503-Fehlerfelder und melden ein unbekanntes Löschresultat mit null, auch wenn die Löschung bereits erfolgt sein könnte. Geworfene Fehler ohne bestätigtes Ergebnis und fehlerhafte Abschlusswerte bleiben HTTP 500 mit unbekanntem Ergebnis; Berechtigungs- und Gültigkeitsprüfungen bleiben unverändert.

## Abgeschlossene Nachweise verlangen

Die CLI benötigt HTTP 200 und die genaue Löschbestätigung. Andere Erfolgsstatus sowie fehlerhafte oder fehlende Abschlusswerte bleiben unbekannt. Die optionale öffentliche Statusvorgabe beim Transport lässt vorhandene Aufrufer standardmäßig unverändert.

## Fehler ohne Wiederholung erklären

Teilweise ausgeführte, abgelehnte und unbekannte Ergebnisse verwenden lokalisierte stderr-Meldungen und einen Fehlerstatus. Fehlende Antworten lösen keine automatische Wiederholung von Löschung oder Bereinigung aus. Deutsche, englische, indonesische und japanische Dokumentation beschreibt den Ergebnisvertrag und sichere Folgeschritte.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a7245ec254d03ff6760c2a84cb31f62b736b9588
