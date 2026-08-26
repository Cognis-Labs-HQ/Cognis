# Zuverlässige Erkennung privater Module

## Das Durchsuchen privater Repositorys bleibt nach Neustarts aktiv

Die Marktplatzquelle Cognis Labs HQ speichert ihre Einstellung zum Durchsuchen privater Repositorys jetzt im Datensatz der Standardquelle. Dadurch bleiben konfigurierte private Module nach einem Serverneustart auffindbar.

## Hintergrundprüfungen entsperren den Schlüsselbund nicht mehr

Die automatische Marktplatzabfrage liest ein PAT nur, wenn der Schlüsselbund bereits entsperrt ist. Authentifizierungsfehler des Anbieters werden gemeldet, ohne unerwartet nach dem Schlüsselbundpasswort zu fragen; eine ausdrücklich ausgelöste Aktualisierung kann weiterhin Zugriff anfordern.

## Jedes zugängliche private Repository wird berücksichtigt

Die private Erkennung schränkt die authentifizierte Repository-Liste von GitHub nicht mehr nach Zugehörigkeit ein, da dadurch Repositorys mit ausdrücklich gewährtem fein abgestuftem PAT-Zugriff fehlen konnten. Scanprotokolle unterscheiden jetzt Katalogergebnisse von installierten Modulen und benennen Repositorys, die wegen ungültiger Manifeste oder fehlgeschlagener Anreicherung ausgeschlossen wurden.
