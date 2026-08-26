# Zuverlässige Erkennung privater Module

## Das Durchsuchen privater Repositorys bleibt nach Neustarts aktiv

Die Marktplatzquelle Cognis Labs HQ speichert ihre Einstellung zum Durchsuchen privater Repositorys jetzt im Datensatz der Standardquelle. Dadurch bleiben konfigurierte private Module nach einem Serverneustart auffindbar.

## Hintergrundprüfungen entsperren den Schlüsselbund nicht mehr

Die automatische Marktplatzabfrage liest ein PAT nur, wenn der Schlüsselbund bereits entsperrt ist. Authentifizierungsfehler des Anbieters werden gemeldet, ohne unerwartet nach dem Schlüsselbundpasswort zu fragen; eine ausdrücklich ausgelöste Aktualisierung kann weiterhin Zugriff anfordern.
