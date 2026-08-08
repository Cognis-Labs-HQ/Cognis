# Zuverlässige Fehlerdialoge bei Dienstunterbrechungen

## Fehlerdialoge bleiben während eines Cognis-Neustarts lesbar

Cognis legt nun das vollständige Dialog-Stylesheet im temporären Cache-Speicher des Browsers ab, solange der Dienst erreichbar ist. Wenn der Server während eines Neustarts vorübergehend nicht verfügbar ist, verwenden Laufzeitfehlerdialoge dieses zwischengespeicherte Stylesheet, statt als unformatierter Seiteninhalt zu erscheinen.
