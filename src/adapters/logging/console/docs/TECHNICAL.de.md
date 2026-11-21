# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Konsolenprotokolle.

## Schnittstellen

Die Konfiguration erfolgt über den zuständigen Funktionsdienst, nicht über einen eigenen Verwaltungsdienst.

## Konfiguration

`level` muss einer der vom Protokolldienst gelieferten Stufen entsprechen. `format` akzeptiert `pretty` oder `json`.

## Verhalten

Geprüfte Werte werden als `consoleLevel` und `consoleFormat` an die Protokollkonfiguration übergeben. Dieser eingebaute Adapter ist gesperrt; das Manifest bietet keine unabhängige Deaktivierung.

## Sicherheit

Nur Administratoren ändern Zustell- oder Speichereinstellungen. Anfragen behalten die vom zuständigen Funktionsdienst geprüften Anmelde- und Ressourcenrechte.

## Referenz

Quellcode und Paketmetadaten: `src/adapters/logging/console/`.
