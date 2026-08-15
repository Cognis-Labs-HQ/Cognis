# Zuverlässige Sitzungszeitlimits bei der Zwei-Faktor-Authentifizierung

## Ausgewähltes Zeitlimit während der Verifizierung beibehalten

Anmeldesitzungen behalten nun die von der Administration oder vom Benutzer gewählte Dauer bei, während die Zwei-Faktor-Verifizierung oder die erforderliche Einrichtung abgeschlossen wird. Dies gilt auch für Sitzungen ohne Ablaufdatum.

## Nicht speicherbare Einstellungen ablehnen

Änderungen am Sitzungszeitlimit geben nun einen Verfügbarkeitsfehler zurück, ohne aktive Sitzungen zu widerrufen, wenn der Einstellungsspeicher deaktiviert ist.
