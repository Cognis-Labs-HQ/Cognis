# Zuverlässige Fehlerdialoge bei Dienstunterbrechungen

**Feature-Zweig:** feature-fix-error-popup-rendering-on-service-restart

## Fehlerdialoge bleiben während eines Cognis-Neustarts lesbar

Cognis legt nun das vollständige Dialog-Stylesheet im temporären Cache-Speicher des Browsers ab, solange der Dienst erreichbar ist. Wenn der Server während eines Neustarts vorübergehend nicht verfügbar ist, verwenden Laufzeitfehlerdialoge dieses zwischengespeicherte Stylesheet, statt als unformatierter Seiteninhalt zu erscheinen.

## Änderungen

- [dc87c30](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc87c30f1621b82081ff176cf15f2df337df3f14)
