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

- [src/adapters/logging/console/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/manifest.json)
- [src/adapters/logging/console/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/package.json)
- [src/adapters/logging/console/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/index.ts)
