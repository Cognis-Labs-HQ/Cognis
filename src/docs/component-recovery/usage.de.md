# Anwendung

Praktische Abläufe für Komponentenwiederherstellung.

## Voraussetzungen

Nutze ein berechtigtes Administratorkonto und sichere vor Codeänderungen.

## Beispiele

Starte `cognisctl component:list`, prüfe die Komponente mit component:info und behebe gemeldete Abhängigkeits- oder Konfigurationsfehler vor erneutem Versuch.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Erwartete Ergebnisse

Erfolgreiche Wiederherstellung registriert ihre Funktionen; abhängige Funktionen bleiben bei fehlenden Voraussetzungen blockiert.

## Fehlerbehebung

Erzwinge Aktionen erst nach Prüfung ihrer Folgen. Fehlende Fähigkeiten erlauben kein Umgehen der Komponentengrenzen.
