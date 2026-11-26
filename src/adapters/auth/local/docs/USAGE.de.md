# Anwendung

Praktische Abläufe für Lokale Konten.

## Voraussetzungen

Kontoadministratoren benötigen eine authentifizierte CLI-Sitzung, um fremde Zugangsdaten zu verwalten.

## Beispiele

Starte `cognisctl user:create` und folge den Eingaben. Mit `cognisctl user:set-password` ersetzt du ein lokales Passwort; `cognisctl user:disable` sperrt ein Konto.

## Erwartete Ergebnisse

Neue Zugangsdaten funktionieren lokal; deaktivierte Konten können sich nicht anmelden. Die Registrierung erstellt normale Benutzer statt Administratoren.

## Fehlerbehebung

Prüfe Benutzername, Kontostatus und Anbieter. Passwörter externer Anbieter werden dort verwaltet und nicht durch Ändern eines lokalen Cognis-Passworts.
