# Anwendung

Praktische Abläufe für Befehlszeilenwerkzeuge.

## Voraussetzungen

Nutze cognisctl mit gültigem berechtigtem Token für geschützte Befehle.

## Beispiele

Führe `cognisctl system:health` und `cognisctl component:list` aus und lies vor Änderungen die Hilfe des Komponentenbefehls.

```sh
cognisctl --help
```

## Erwartete Ergebnisse

Befehle zeigen Serverergebnisse und prüfen dieselben Rechte wie HTTP-Aktionen.

## Fehlerbehebung

Prüfe Serveradresse und COGNIS_CLI_TOKEN_PATH. Tokens und Passwörter gehören in geschützte Konfiguration statt geteilte Terminalausgabe.
