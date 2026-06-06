# Kalenderfreigaben

## Mehrere Links sind wieder da

Das Kalender-Popup behält jetzt alle erzeugten Freigabelinks, statt nur das
neueste Ergebnis zu zeigen. Jeder Eintrag erscheint als eigener einklappbarer
Block mit Linknamen sowie getrennten CalDAV- und ICS-Kopierfeldern, damit sich
mehrere Feeds übersichtlich verwalten lassen.

## Private Links erhalten Passphrasen

Private Kalenderfreigaben erzeugen jetzt pro Link eine eigene Passphrase. Das
Popup zeigt diese Passphrase neben den Export-URLs an, und die Freigabe-Endpunkte
akzeptieren sie für CalDAV- und ICS-Zugriffe ohne Cognis-Bearer-Token.

## Freigabelinks laufen wieder ab

Erzeugte Links beachten wieder die gewählte Ablaufzeit und werden nach diesem
Zeitpunkt deaktiviert. Auch öffentliche Kalender erzeugen nun eigene
Freigabe-URLs, sodass jeder erzeugte Eintrag unabhängig ablaufen kann.
