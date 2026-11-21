# Anwendung

Praktische Abläufe für Freigaben.

## Voraussetzungen

Der Inhalt muss teilbar und eine passende Methode aktiv sein.

## Beispiele

Wähle Link oder Benutzer, prüfe Rechte und Schutz und teste als Empfänger. Widerrufe alte Freigaben nach Bestätigung.

```sh
cognisctl share:tokens --help
cognisctl share:resolve --help
cognisctl share:recipients:users --help
cognisctl share:approvals:pending --help
```

## Erwartete Ergebnisse

Empfänger erhalten nur erklärten Inhaltszugriff; Gastsitzungen werden keine normalen Kontositzungen.

## Fehlerbehebung

Prüfe Ablauf, Passwort, Empfänger und aktuelle Rechte. Widerruf beendet Zugriff auch bei weiter sichtbaren alten Links.
