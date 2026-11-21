# Anwendung

Praktische Abläufe für Befehlszeilenwerkzeuge.

## Voraussetzungen

Nutze cognisctl mit gültigem berechtigtem Token für geschützte Befehle.

## Beispiele

Führe `cognisctl system:health` und `cognisctl component:list` aus und lies vor Änderungen die Hilfe des Komponentenbefehls.

```sh
cognisctl --help
```

Führen Sie `cognisctl user:delete <username>` aus. Die bestehende interaktive Namensabfrage bleibt verfügbar. Eine fehlgeschlagene Vorabprüfung stoppt vor dem Senden von DELETE. Normaler bestätigter Erfolg zeigt die bisherige Löschübersicht und endet mit Status 0.

Wurde das Konto gelöscht, während die Bereinigung fehlschlug, meldet der Befehl die ausgeführte Löschung und die unvollständige Bereinigung. Wiederholen Sie die Löschung nicht zur Reparatur abhängiger Ressourcen; prüfen Sie den Serverfehler und das Wiederherstellungsverfahren der Komponente. Abgelehnte oder unbekannte Löschungen enden ebenfalls mit Status 1. Fehlertext erscheint auf stderr; stdout enthält keine Erfolgsübersicht.

## Erwartete Ergebnisse

Befehle zeigen Serverergebnisse und prüfen dieselben Rechte wie HTTP-Aktionen.

## Fehlerbehebung

Prüfe Serveradresse und COGNIS_CLI_TOKEN_PATH. Tokens und Passwörter gehören in geschützte Konfiguration statt geteilte Terminalausgabe.
