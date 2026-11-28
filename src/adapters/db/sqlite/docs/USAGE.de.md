# Anwendung

Praktische Abläufe für SQLite.

## Voraussetzungen

Eine einbettende Laufzeit muss den SQLite-Client bereitstellen; die Standardinstallation bindet diese Klasse nicht als auswählbaren Anbieter ein.

## Beispiele

Stelle einen SqliteClient mit all, run und exec bereit und verwende SqliteDatabaseGateway für Abfrage und Transaktion.

## Erwartete Ergebnisse

Abfragen liefern Zeilen; erfolgreiche Transaktionen werden bestätigt, ausgelöste Fehler führen zum Zurücksetzen.

## Fehlerbehebung

DB_TYPE allein bindet SQLite nicht in den Standardserver ein. Prüfe Clientintegration und Dateizugriff deiner Laufzeit.
