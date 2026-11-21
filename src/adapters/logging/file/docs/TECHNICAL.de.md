# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Dateiprotokolle.

## Schnittstellen

Die Konfiguration erfolgt über den zuständigen Funktionsdienst, nicht über einen eigenen Verwaltungsdienst.

## Konfiguration

`level` verwendet die unterstützten Protokollstufen. `rotateMaxBytes` ist eine endliche positive Zahl, `rotateMaxFiles` eine nichtnegative Ganzzahl und `rotateCompress` ein Wahrheitswert.

## Verhalten

Der Adapter liefert `fileLevel` und die Rotationseinstellungen `maxBytes`, `maxFiles` und `compressRotated`. Speicherung und Rotation gehören dem Protokolldienst.

## Sicherheit

Nur Administratoren ändern Zustell- oder Speichereinstellungen. Anfragen behalten die vom zuständigen Funktionsdienst geprüften Anmelde- und Ressourcenrechte.

## Referenz

- [src/adapters/logging/file/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/file/manifest.json)
- [src/adapters/logging/file/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/file/package.json)
- [src/adapters/logging/file/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/file/index.ts)
