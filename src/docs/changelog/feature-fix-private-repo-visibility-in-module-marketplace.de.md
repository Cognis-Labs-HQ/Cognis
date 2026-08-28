# Zuverlässige Erkennung privater Module

**Feature-Zweig:** feature-fix-private-repo-visibility-in-module-marketplace

## Das Durchsuchen privater Repositorys bleibt nach Neustarts aktiv

Die Marktplatzquelle Cognis Labs HQ speichert ihre Einstellung zum Durchsuchen privater Repositorys jetzt im Datensatz der Standardquelle. Dadurch bleiben konfigurierte private Module nach einem Serverneustart auffindbar.

## Hintergrundprüfungen entsperren den Schlüsselbund nicht mehr

Die automatische Marktplatzabfrage führt jetzt eine authentifizierte Quellensuche durch und liest ein PAT nur, wenn der Schlüsselbund bereits entsperrt ist. Der Schlüsselbund-Resolver prüft zwischengespeicherte Zugangsdaten weiterhin und entfernt ungültige Werte, ohne unerwartet nach dem Schlüsselbundpasswort zu fragen; eine ausdrücklich ausgelöste Aktualisierung kann weiterhin Zugriff anfordern.

## Jedes zugängliche private Repository wird berücksichtigt

Die private Erkennung schränkt die authentifizierte Repository-Liste von GitHub nicht mehr nach Zugehörigkeit ein, da dadurch Repositorys mit ausdrücklich gewährtem fein abgestuftem PAT-Zugriff fehlen konnten. Scanprotokolle unterscheiden jetzt Katalogergebnisse von installierten Modulen und benennen Repositorys, die wegen ungültiger Manifeste oder fehlgeschlagener Anreicherung ausgeschlossen wurden.

## Quelleneinstellungen verwenden dauerhaften Containerspeicher

Produktionscontainer schreiben Marktplatz-Quelldatensätze jetzt in das eingebundene Konfigurationsvolume statt in einen Pfad innerhalb des austauschbaren Server-Builds. Der Datensatz behält den Schalter für private Scans und die Kennung, mit der das PAT nach einem Neustart aus dem verschlüsselten, serversynchronisierten Schlüsselbund des Benutzers aufgelöst wird.

## Änderungen

- [2d31b43](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d31b43565ee1b05d00301b9ed1faaf99a8a6f89)
